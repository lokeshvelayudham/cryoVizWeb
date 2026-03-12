import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import prisma from "@/lib/prisma";
import {
  getInstitutions,
  getUsers,
  getDatasets,
  createInstitution,
  createUser,
  updateInstitution,
  updateUser,
  deleteInstitution,
  deleteUser,
  createDataset,
  updateDataset,
  deleteDataset,
  updateUserDatasets,
} from "@/lib/models";
import type { Dataset, Institution, User } from "@/lib/models";
import { createDatasetAssignmentNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- utils ----------
const isObj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object";

const jerr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

// ---------- GET ----------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const datasetId = searchParams.get("datasetId");

  if (datasetId) {
    const datasets = await getDatasets();
    const dataset = (datasets as Dataset[]).find(
      (d) => d._id?.toString() === datasetId
    );
    if (dataset) return NextResponse.json({ dataset: { ...dataset, _id: dataset._id?.toString() } });
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const [institutions, users, datasets] = await Promise.all([
    getInstitutions(),
    getUsers(),
    getDatasets(),
  ]);

  const safeInstitutions = institutions.map(i => ({ ...i, _id: i._id?.toString() }));
  const safeUsers = users.map(u => ({ ...u, _id: u._id?.toString(), institutionId: u.institutionId?.toString() }));
  const safeDatasets = datasets.map(d => ({ ...d, _id: d._id?.toString() }));

  return NextResponse.json({ institutions: safeInstitutions, users: safeUsers, datasets: safeDatasets });
}

// ---------- POST (create + assign) ----------
type PostAction = "dataset" | "institution" | "user" | "assign-datasets";

function isPostBody(x: unknown): x is { action: PostAction } & Record<string, unknown> {
  return isObj(x) && typeof x.action === "string";
}

export async function POST(request: NextRequest) {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 400 });
  }

  const body = await request.json();
  if (!isPostBody(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "dataset": {
        const data = body as Omit<Dataset, "_id" | "createdAt"> & { action: "dataset" };
        const result = await createDataset(data);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
      }

      case "institution": {
        const b = body as { action: "institution" } & Partial<Institution>;
        if (typeof b.name !== "string" || typeof b.abbr !== "string") {
          return NextResponse.json({ error: "Missing name/abbr" }, { status: 400 });
        }
        const inst: Omit<Institution, "_id" | "createdAt" | "updatedAt"> = {
          name: b.name,
          abbr: b.abbr,
          type: (b.type as Institution["type"]) ?? "Others",
          industry: b.industry ?? "",
          address: b.address ?? "",
          phone: b.phone ?? "",
          email: b.email ?? "",
          website: b.website ?? "",
          status: (b.status as Institution["status"]) ?? "Active",
        };
        const result = await createInstitution(inst);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
      }

      case "user": {
        const b = body as { action: "user" } & Partial<User>;
        if (typeof b.email !== "string" || typeof b.name !== "string") {
          return NextResponse.json({ error: "Missing name/email" }, { status: 400 });
        }
        if (typeof b.institutionId !== "string" && typeof b.institutionId !== "object") {
          return NextResponse.json({ error: "Invalid institutionId" }, { status: 400 });
        }
        const user: Omit<User, "_id" | "logins" | "lastLogin" | "assignedDatasets" | "createdAt" | "updatedAt"> = {
          name: b.name,
          email: b.email,
          accessLevel: (b.accessLevel as User["accessLevel"]) ?? "user",
          institutionId: b.institutionId as string,
        };
        const result = await createUser(user);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
      }

      case "assign-datasets": {
        const b = body as { action: "assign-datasets"; email?: string; datasets?: unknown };
        if (typeof b.email !== "string" || !Array.isArray(b.datasets) || !b.datasets.every((d) => typeof d === "string")) {
          return NextResponse.json({ error: "Invalid assign payload" }, { status: 400 });
        }

        const result = await updateUserDatasets(b.email, b.datasets);

        if (result.modifiedCount > 0) {
          try {
            const user = await prisma.user.findUnique({ where: { email: b.email } });
            if (user) {
              const datasetIds = b.datasets as string[];
              const datasets = await prisma.dataset.findMany({
                where: { id: { in: datasetIds } }
              });

              for (const dataset of datasets) {
                await createDatasetAssignmentNotification(
                  user.id,
                  dataset.name || "Unknown Dataset"
                );
              }
            }
          } catch (notificationError) {
            console.error("Failed to create dataset assignment notifications:", notificationError);
          }
        }

        return NextResponse.json({ success: !!result.modifiedCount });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    console.error("POST /api/admin error:", e);
    return NextResponse.json(jerr(e), { status: 400 });
  }
}

// ---------- PUT (updates) ----------
type PutAction = "update-institution" | "update-user" | "update-dataset";

function isPutBody(x: unknown): x is { action: PutAction } & Record<string, unknown> {
  return isObj(x) && typeof x.action === "string";
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!isPutBody(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    switch (body.action) {
      case "update-institution": {
        const b = body as {
          action: "update-institution";
          _id?: string;
        } & Partial<Institution>;
        if (!b._id) return NextResponse.json({ error: "_id required" }, { status: 400 });

        const inst: any = {
          ...(b as any),
          _id: b._id,
        };
        const result = await updateInstitution(inst);
        return NextResponse.json({ success: !!result.modifiedCount });
      }

      case "update-user": {
        const b = body as {
          action: "update-user";
          _id?: string;
        } & Partial<User>;
        if (!b._id || typeof b.email !== "string") {
          return NextResponse.json({ error: "Missing _id/email" }, { status: 400 });
        }
        
        const user: any = {
          ...(b as any),
          _id: b._id,
          institutionId: b.institutionId,
          logins: b.logins ?? 0,
          assignedDatasets: Array.isArray(b.assignedDatasets) ? b.assignedDatasets : [],
        };
        const result = await updateUser(user);
        return NextResponse.json({ success: !!result.modifiedCount });
      }

      case "update-dataset": {
        const b = body as {
          action: "update-dataset";
          _id?: string;
        } & Partial<Dataset>;
        if (!b._id) return NextResponse.json({ error: "_id required" }, { status: 400 });
        
        const dataset: any = {
          ...(b as any),
          _id: b._id,
        };
        const result = await updateDataset(dataset);
        return NextResponse.json({ success: !!result.modifiedCount });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (e) {
    console.error("PUT /api/admin error:", e);
    return NextResponse.json(jerr(e), { status: 400 });
  }
}

// ---------- DELETE ----------
function isDeleteBody(x: unknown): x is { action: "delete-institution" | "delete-user" | "delete-dataset"; id: string } {
  return isObj(x) && typeof x.action === "string" && typeof x.id === "string";
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();
  if (!isDeleteBody(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const { id, action } = body;
    if (action === "delete-institution") {
      const r = await deleteInstitution(id);
      return NextResponse.json({ success: !!r.deletedCount });
    }
    if (action === "delete-user") {
      const r = await deleteUser(id);
      return NextResponse.json({ success: !!r.deletedCount });
    }
    if (action === "delete-dataset") {
      try {
        const dataset = await prisma.dataset.findUnique({ where: { id } });

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connectionString && dataset) {
          const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
          const containerName = process.env.AZURE_CONTAINER || "cryovizweb";
          const containerClient = blobServiceClient.getContainerClient(containerName);

          let prefix: string | null = null;
          if (dataset.datasetId) {
            prefix = `dataset-${dataset.datasetId}/`;
          } else if (dataset.brightfieldBlobUrl) {
            try {
              const url = new URL(dataset.brightfieldBlobUrl as string);
              const parts = url.pathname.split("/").filter(Boolean);
              const dsIdx = parts.findIndex(p => p && p.startsWith("dataset-"));
              if (dsIdx >= 1) {
                prefix = parts.slice(dsIdx, dsIdx + 1).join("/") + "/";
              }
            } catch { }
          }

          if (prefix) {
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
              try {
                await containerClient.deleteBlob(blob.name);
              } catch (e) {
                console.error("Failed to delete blob:", blob.name, e);
              }
            }
          }
        }

        const r = await deleteDataset(id);
        return NextResponse.json({ success: !!r.deletedCount });
      } catch (e) {
        console.error("DELETE dataset with Azure cleanup error:", e);
        const r = await deleteDataset(id);
        return NextResponse.json({ success: !!r.deletedCount, warning: "Azure cleanup may have failed" });
      }
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("DELETE /api/admin error:", e);
    return NextResponse.json(jerr(e), { status: 400 });
  }
}