import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const datasetId = searchParams.get("datasetId");

  if (datasetId) {
    const datasets = await getDatasets();
    const dataset = datasets.find((d) => d._id?.toString() === datasetId);
    if (dataset) {
      return NextResponse.json({ dataset });
    }
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }

  const institutions = await getInstitutions();
  const users = await getUsers();
  const datasets = await getDatasets();
  return NextResponse.json({ institutions, users, datasets });
}

export async function POST(request: Request) {
  const { action, ...data } = await request.json();

  if (action === "institution") {
    const result = await createInstitution(data as any);
    return NextResponse.json({ success: !!result.insertedId });
  } else if (action === "user") {
    try {
      const result = await createUser(data as any);
      return NextResponse.json({ success: !!result.insertedId });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  } else if (action === "dataset") {
    try {
      const result = await createDataset(data as any);
      return NextResponse.json({ success: !!result.insertedId });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  } else if (action === "assign-datasets") {
    const result = await updateUserDatasets(data.email, data.datasets);
    return NextResponse.json({ success: !!result.modifiedCount });
  }
  return NextResponse.json({ success: false }, { status: 400 });
}

export async function PUT(request: Request) {
  const { action, ...data } = await request.json();

  if (action === "update-institution") {
    const result = await updateInstitution(data as any);
    return NextResponse.json({ success: !!result.modifiedCount });
  } else if (action === "update-user") {
    try {
      const result = await updateUser(data as any);
      return NextResponse.json({ success: !!result.modifiedCount });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  } else if (action === "update-dataset") {
    try {
      const result = await updateDataset(data as any);
      return NextResponse.json({ success: !!result.modifiedCount });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
  }
  return NextResponse.json({ success: false }, { status: 400 });
}

export async function DELETE(request: Request) {
  const { id, action } = await request.json();
  if (!id) return NextResponse.json({ success: false }, { status: 400 });

  if (action === "delete-institution") {
    const result = await deleteInstitution(id);
    return NextResponse.json({ success: !!result.deletedCount });
  } else if (action === "delete-user") {
    const result = await deleteUser(id);
    return NextResponse.json({ success: !!result.deletedCount });
  } else if (action === "delete-dataset") {
    const result = await deleteDataset(id);
    return NextResponse.json({ success: !!result.deletedCount });
  }
  return NextResponse.json({ success: false }, { status: 400 });
}