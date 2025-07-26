import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const datasetId = url.searchParams.get("datasetId");

    if (!datasetId) {
      return NextResponse.json({ error: "datasetId is required" }, { status: 400 });
    }

    const views = await db.collection("views").find({ datasetId }).toArray();
    return NextResponse.json({ views }, { status: 200 });
  } catch (error) {
    console.error("Error fetching views:", error);
    return NextResponse.json({ error: "Failed to fetch views" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await req.json();

    if (!body.name || !body.coords || !body.zoom || !body.pan || !body.creator || !body.datasetId) {
      return NextResponse.json({ error: "name, coords, zoom, pan, creator, and datasetId are required" }, { status: 400 });
    }

    const view = {
      name: body.name,
      coords: body.coords,
      zoom: body.zoom,
      pan: body.pan,
      creator: body.creator,
      datasetId: body.datasetId,
      createdAt: new Date(),
      loadCount: 0,
      loadStats: [],
    };
    const result = await db.collection("views").insertOne(view);
    return NextResponse.json(
      { message: "View saved successfully", view: { ...view, _id: result.insertedId } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving view:", error);
    return NextResponse.json({ error: "Failed to save view" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const body = await req.json();
    const { id, name, datasetId } = body;

    if (!id || !name || !datasetId) {
      return NextResponse.json({ error: "id, name, and datasetId are required" }, { status: 400 });
    }

    const result = await db.collection("views").updateOne(
      { _id: new ObjectId(id), datasetId },
      { $set: { name } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "View name updated successfully", view: { id, name } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating view name:", error);
    return NextResponse.json({ error: "Failed to update view name" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const datasetId = url.searchParams.get("datasetId");

    if (!id || !datasetId) {
      return NextResponse.json({ error: "id and datasetId are required" }, { status: 400 });
    }

    const result = await db.collection("views").deleteOne({
      _id: new ObjectId(id),
      datasetId,
    });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "View deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting view:", error);
    return NextResponse.json({ error: "Failed to delete view" }, { status: 500 });
  }
}