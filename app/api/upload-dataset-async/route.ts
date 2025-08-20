import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";


export const dynamic = "force-dynamic";

interface UploadStatus {
  uploadId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  datasetName: string;
  startedAt: Date;
  completedAt?: Date;
  result?: { datasetId?: string };
  error?: string;
}

const updateUploadStatus = async (uploadId: string, userId: string, update: Partial<UploadStatus>) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    
    await db.collection<UploadStatus>("upload_status").updateOne(
      { uploadId, userId },
      {
        $set: update,
        $setOnInsert: {
          uploadId,
          userId,
          startedAt: new Date(),
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error updating upload status:", error);
  }
};


// POST - Start async upload
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const uploadId = crypto.randomUUID();
    const userId = session.user.email;

    // Create initial upload status
    await updateUploadStatus(uploadId, userId, {
      status: "pending",
      progress: 0,
      message: "Starting upload...",
      datasetName: formData.get("name") as string || "Unknown Dataset",
    });

    // Fire-and-forget: forward to Python processor and return immediately
    const pythonUrl = process.env.PYTHON_PROCESSOR_URL || "http://localhost:8000/process-dataset";

    // Append tracking fields for Python
    formData.append("uploadId", uploadId);
    formData.append("userId", userId);

    // Optional: let Python know where to post back
    formData.append("nextBaseUrl", request.nextUrl.origin);

    // Do not await; let the request proceed independently
    fetch(pythonUrl, { method: "POST", body: formData }).catch((e) => {
      console.error("Failed to contact Python processor:", e);
    });

    return NextResponse.json({ 
      uploadId,
      message: "Upload started successfully" 
    });

  } catch (error) {
    console.error("POST /api/upload-dataset-async error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start upload" },
      { status: 500 }
    );
  }
}
