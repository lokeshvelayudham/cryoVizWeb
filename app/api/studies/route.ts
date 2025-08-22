import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Study {
  _id?: string;
  name: string;
  datasetId: string;
  user: string;
  createdAt: Date;
  updatedAt?: Date;
  description?: string;
  annotationCount?: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const datasetId = req.nextUrl.searchParams.get("datasetId");
    if (!datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const studies = await db
      .collection("studies")
      .find({ datasetId, user: userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedStudies = studies.map((study) => ({
      _id: study._id.toString(),
      name: study.name,
      datasetId: study.datasetId,
      user: study.user,
      createdAt: study.createdAt,
      updatedAt: study.updatedAt,
      description: study.description,
      annotationCount: 0, // Will be calculated by frontend
    }));

    console.log("GET studies:", formattedStudies.map(s => ({ _id: s._id, name: s.name, user: s.user, datasetId: s.datasetId })));
    return NextResponse.json(formattedStudies, { status: 200 });
  } catch (error) {
    console.error("Error fetching studies:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to fetch studies: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch studies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const studyData: Omit<Study, "_id" | "user" | "createdAt"> = await req.json();
    console.log("POST study request payload:", { name: studyData.name, user: userEmail, datasetId: studyData.datasetId });

    if (!studyData.name || typeof studyData.name !== "string" || studyData.name.trim() === "") {
      return NextResponse.json({ error: "Study name cannot be empty" }, { status: 400 });
    }

    if (!studyData.datasetId) {
      return NextResponse.json({ error: "Dataset ID is required" }, { status: 400 });
    }

    // Check if study name already exists for this user and dataset
    const client = await clientPromise;
    const db = client.db();
    
    const existingStudy = await db.collection("studies").findOne({
      name: studyData.name.trim(),
      datasetId: studyData.datasetId,
      user: userEmail
    });

    if (existingStudy) {
      return NextResponse.json({ error: "Study with this name already exists" }, { status: 409 });
    }

    const now = new Date();
    const newStudy: Omit<Study, "_id"> = {
      name: studyData.name.trim(),
      datasetId: studyData.datasetId,
      user: userEmail,
      createdAt: now,
      updatedAt: now,
      description: studyData.description,
    };

    const result = await db.collection("studies").insertOne(newStudy);

    console.log("POST study result:", { insertedId: result.insertedId.toString(), name: newStudy.name });
    return NextResponse.json({ 
      _id: result.insertedId.toString(), 
      name: newStudy.name,
      datasetId: newStudy.datasetId,
      user: newStudy.user,
      createdAt: newStudy.createdAt,
      updatedAt: newStudy.updatedAt,
      description: newStudy.description,
      annotationCount: 0
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating study:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to create study: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to create study" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { _id, name, description } = await req.json();
    
    if (!_id) {
      return NextResponse.json({ error: "Study ID is required" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Study name cannot be empty" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    const result = await db.collection("studies").updateOne(
      { _id: new ObjectId(_id), user: userEmail },
      { 
        $set: { 
          name: name.trim(), 
          description,
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Study not found or access denied" }, { status: 404 });
    }

    console.log("PUT study result:", { _id, name: name.trim() });
    return NextResponse.json({ 
      success: true, 
      message: "Study updated successfully",
      _id,
      name: name.trim(),
      description,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating study:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to update study: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update study" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { _id, datasetId } = await req.json();
    
    if (!_id || !datasetId) {
      return NextResponse.json({ error: "Study ID and Dataset ID are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // First, check if there are any annotations in this study
    const annotationCount = await db.collection("annotations").countDocuments({
      studyName: { $exists: true, $ne: null },
      datasetId,
      user: userEmail
    });

    if (annotationCount > 0) {
      return NextResponse.json({ 
        error: "Cannot delete study with existing annotations. Please reassign or delete annotations first." 
      }, { status: 400 });
    }

    const result = await db.collection("studies").deleteOne({
      _id: new ObjectId(_id),
      datasetId,
      user: userEmail
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Study not found or access denied" }, { status: 404 });
    }

    console.log("DELETE study result:", { _id, datasetId });
    return NextResponse.json({ 
      success: true, 
      message: "Study deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting study:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to delete study: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to delete study" }, { status: 500 });
  }
}
