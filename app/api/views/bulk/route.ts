import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await req.json();
    const { ids, datasetId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0 || !datasetId) {
      return NextResponse.json({ error: "ids and datasetId are required" }, { status: 400 });
    }

    const objectIds = ids.map((id: string) => new ObjectId(id));
    const result = await db.collection("views").deleteMany({
      _id: { $in: objectIds },
      datasetId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "No views found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Views deleted successfully", deletedCount: result.deletedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting views:", error);
    return NextResponse.json({ error: "Failed to delete views" }, { status: 500 });
  }
}