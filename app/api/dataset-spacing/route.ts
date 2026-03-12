import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(request: NextRequest) {
  try {
    const { datasetId, spacing } = await request.json();

    if (!datasetId || typeof spacing !== 'number' || spacing <= 0) {
      return NextResponse.json(
        { error: "Invalid datasetId or spacing value" },
        { status: 400 }
      );
    }

    const existingDataset = await prisma.dataset.findUnique({
      where: { id: datasetId }
    });

    if (!existingDataset) {
      return NextResponse.json(
        { error: "Dataset not found" },
        { status: 404 }
      );
    }

    await prisma.dataset.update({
      where: { id: datasetId },
      data: { spacing: spacing }
    });

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
