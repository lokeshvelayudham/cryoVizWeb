import { NextRequest, NextResponse } from "next/server";
import { BlobServiceClient } from "@azure/storage-blob";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
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
    if (dataset) return NextResponse.json({ dataset });
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const [institutions, users, datasets] = await Promise.all([
    getInstitutions(),
    getUsers(),
    getDatasets(),
  ]);

  return NextResponse.json({ institutions, users, datasets });
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
        // Expect a Dataset sans _id/createdAt (createDataset handles cleanup)
        const data = body as Omit<Dataset, "_id" | "createdAt"> & { action: "dataset" };
        const result = await createDataset(data);
        return NextResponse.json({ success: true, id: result.insertedId.toString() });
      }

      case "institution": {
        // Minimal Institution fields; model adds createdAt
        const b = body as { action: "institution" } & Partial<Institution>;
        if (typeof b.name !== "string" || typeof b.abbr !== "string") {
          return NextResponse.json({ error: "Missing name/abbr" }, { status: 400 });
        }
        const inst: Omit<Institution, "_id" | "createdAt"> = {
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
        if (!(b.institutionId instanceof ObjectId) && typeof b.institutionId !== "string") {
          return NextResponse.json({ error: "Invalid institutionId" }, { status: 400 });
        }
        const user: Omit<User, "_id" | "logins" | "lastLogin" | "assignedDatasets"> = {
          name: b.name,
          email: b.email,
          accessLevel: (b.accessLevel as User["accessLevel"]) ?? "user",
          institutionId:
            b.institutionId instanceof ObjectId ? b.institutionId : new ObjectId(b.institutionId),
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
        // Convert string id -> ObjectId and pass full Institution shape to model
        const b = body as {
          action: "update-institution";
          _id?: string | ObjectId;
        } & Partial<Institution>;
        if (!b._id) return NextResponse.json({ error: "_id required" }, { status: 400 });

        const _id = b._id instanceof ObjectId ? b._id : new ObjectId(b._id);
        const inst: Institution = {
          ...(b as Institution),
          _id,
          createdAt: (b.createdAt as Date) ?? new Date(0), // not used by update
        };
        const result = await updateInstitution(inst);
        return NextResponse.json({ success: !!result.modifiedCount });
      }

      case "update-user": {
        const b = body as {
          action: "update-user";
          _id?: string | ObjectId;
        } & Partial<User>;
        if (!b._id || typeof b.email !== "string") {
          return NextResponse.json({ error: "Missing _id/email" }, { status: 400 });
        }
        const _id = b._id instanceof ObjectId ? b._id : new ObjectId(b._id);
        const user: User = {
          ...(b as User),
          _id,
          institutionId:
            b.institutionId instanceof ObjectId ? b.institutionId : new ObjectId(b.institutionId as unknown as string),
          logins: b.logins ?? 0,
          assignedDatasets: Array.isArray(b.assignedDatasets) ? b.assignedDatasets : [],
        };
        const result = await updateUser(user);
        return NextResponse.json({ success: !!result.modifiedCount });
      }

      case "update-dataset": {
        const b = body as {
          action: "update-dataset";
          _id?: string | ObjectId;
        } & Partial<Dataset>;
        if (!b._id) return NextResponse.json({ error: "_id required" }, { status: 400 });
        const _id = b._id instanceof ObjectId ? b._id : new ObjectId(b._id);
        const dataset: Dataset = {
          // model’s updateDataset expects Dataset with _id
          ...(b as Dataset),
          _id,
          createdAt: (b.createdAt as Date) ?? new Date(0), // placeholder; not used in update
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
        // Fetch dataset to discover datasetId / blob prefixes
        const client = await clientPromise;
        const db = client.db();
        const dataset = await db.collection("datasets").findOne({ _id: new ObjectId(id) });

        // Attempt Azure cleanup if configured
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (connectionString) {
          const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
          const containerName = process.env.AZURE_CONTAINER || "cryovizweb";
          const containerClient = blobServiceClient.getContainerClient(containerName);

          // Determine prefix (prefer datasetId)
          let prefix: string | null = null;
          if (dataset?.datasetId) {
            prefix = `dataset-${dataset.datasetId}/`;
          } else if (dataset?.brightfieldBlobUrl) {
            try {
              const url = new URL(dataset.brightfieldBlobUrl as string);
              const parts = url.pathname.split("/").filter(Boolean);
              // parts[0] is container, rest is path
              prefix = parts.slice(1, 3).join("/") + "/"; // e.g., dataset-<id>/<modality>/ → trim to dataset-<id>/ if possible
              // Ensure we only keep dataset-<id>/
              const dsIdx = parts.findIndex(p => p.startsWith("dataset-"));
              if (dsIdx >= 1) {
                prefix = parts.slice(dsIdx, dsIdx + 1).join("/") + "/";
              }
            } catch {}
          }

          if (prefix) {
            // Delete all blobs under prefix
            for await (const blob of containerClient.listBlobsFlat({ prefix })) {
              try {
                await containerClient.deleteBlob(blob.name);
              } catch (e) {
                console.error("Failed to delete blob:", blob.name, e);
              }
            }
          }
        }

        // Finally, remove dataset document
        const r = await deleteDataset(id);
        return NextResponse.json({ success: !!r.deletedCount });
      } catch (e) {
        console.error("DELETE dataset with Azure cleanup error:", e);
        // Attempt DB delete anyway to avoid blocking UI
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