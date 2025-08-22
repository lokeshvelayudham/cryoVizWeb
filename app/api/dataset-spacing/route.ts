import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(request: NextRequest) {
  try {
    const { datasetId, spacing } = await request.json();

    if (!datasetId || typeof spacing !== 'number' || spacing <= 0) {
      return NextResponse.json(
        { error: "Invalid datasetId or spacing value" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("datasets").updateOne(
      { _id: new ObjectId(datasetId) },
      { $set: { spacing: spacing } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Spacing updated successfully",
      spacing: spacing 
    });

  } catch (error) {
    console.error("Error updating dataset spacing:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
