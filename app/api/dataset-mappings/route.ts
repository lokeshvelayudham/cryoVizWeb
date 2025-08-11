// app/api/dataset-mappings/route.ts
import { NextResponse } from "next/server";
import {
  getDatasetMappings,
  getDatasetMappingByParent,
  createDatasetMapping,
  updateDatasetMapping,
  deleteDatasetMapping,
} from "@/lib/models";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get("parentId");
  if (parentId) {
    const mapping = await getDatasetMappingByParent(parentId);
    return NextResponse.json({ mapping });
  }
  const mappings = await getDatasetMappings();
  return NextResponse.json({ mappings });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { parentId, children } = body || {};
    if (!parentId) return NextResponse.json({ error: "parentId required" }, { status: 400 });

    // basic validation
    const childIds: string[] = (children || []).map((c: any) => c.datasetId);
    if (childIds.includes(parentId)) {
      return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
    }

    const dedup = new Set(childIds);
    if (dedup.size !== childIds.length) {
      return NextResponse.json({ error: "Duplicate child datasetIds" }, { status: 400 });
    }

    const result = await createDatasetMapping({ parentId, children: children || [] });
    return NextResponse.json({ success: true, id: result.insertedId.toString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, parentId, children } = body || {};
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (children) {
      const childIds: string[] = children.map((c: any) => c.datasetId);
      if (parentId && childIds.includes(parentId)) {
        return NextResponse.json({ error: "Parent cannot be a child" }, { status: 400 });
      }
      const dedup = new Set(childIds);
      if (dedup.size !== childIds.length) {
        return NextResponse.json({ error: "Duplicate child datasetIds" }, { status: 400 });
      }
    }

    const result = await updateDatasetMapping(id, { parentId, children });
    return NextResponse.json({ success: !!result.modifiedCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const result = await deleteDatasetMapping(id);
  return NextResponse.json({ success: !!result.deletedCount });
}