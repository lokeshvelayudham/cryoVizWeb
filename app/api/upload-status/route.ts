import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createUploadNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface UploadStatus {
  _id?: string;
  uploadId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  message: string;
  datasetName: string;
  startedAt: Date;
  completedAt?: Date;
  result?: { datasetId?: string };
  error?: string;
}

// GET - Get upload status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    const client = await clientPromise;
    const db = client.db();

    if (uploadId) {
      // Get specific upload status
      const upload = await db.collection<UploadStatus>("upload_status")
        .findOne({ uploadId, userId: session.user.email });

      if (!upload) {
        return NextResponse.json({ error: "Upload not found" }, { status: 404 });
      }

      // Ensure we don't pass ObjectId directly to NextResponse.json to avoid serialization errors
      const safeUpload = { ...upload, _id: upload._id?.toString() };
      return NextResponse.json(safeUpload);
    } else {
      // Get all uploads for user
      const uploads = await db.collection<UploadStatus>("upload_status")
        .find({ userId: session.user.email })
        .sort({ startedAt: -1 })
        .limit(20)
        .toArray();

      // Ensure we don't pass ObjectId directly to NextResponse.json to avoid serialization errors
      const safeUploads = uploads.map(u => ({ ...u, _id: u._id?.toString() }));

      // Signal completion if any just completed (can be used by client to refresh datasets)
      return NextResponse.json({ uploads: safeUploads });
    }

  } catch (error) {
    console.error("GET /api/upload-status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get upload status" },
      { status: 500 }
    );
  }
}

// POST - Create or update upload status
export async function POST(request: NextRequest) {
  try {
    const internalSecret = request.headers.get("x-internal-secret");
    const isInternal =
      internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

    const session = isInternal ? null : await getServerSession(authOptions);
    if (!isInternal && !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, status, progress, message, datasetName, result, error } = body;

    if (!uploadId) {
      return NextResponse.json({ error: "Upload ID is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const updateData: Partial<UploadStatus> = {
      status,
      progress: Math.max(0, Math.min(100, progress || 0)),
      message: message || "",
    };

    if (status === "completed") {
      updateData.completedAt = new Date();
      updateData.result = result;
    }

    if (status === "failed") {
      updateData.completedAt = new Date();
      updateData.error = typeof error === 'object' && error !== null ? JSON.stringify(error) : (error ? String(error) : "Unknown error");
    }

    // Update existing or create new
    const result_op = await db.collection<UploadStatus>("upload_status").updateOne(
      { uploadId, userId: isInternal ? body.userId : session!.user!.email },
      {
        $set: updateData,
        $setOnInsert: {
          uploadId,
          userId: isInternal ? body.userId : session!.user!.email,
          datasetName: datasetName || "Unknown Dataset",
          startedAt: new Date(),
        }
      },
      { upsert: true }
    );

    // Create notification when upload completes successfully
    if (status === "completed" && result_op.modifiedCount > 0) {
      try {
        const userId = isInternal ? body.userId : session!.user!.email;

        // Get user ID from email for notification
        const user = await db.collection("users").findOne({ email: userId });
        if (user && user.accessLevel === 'admin') {
          await createUploadNotification(
            uploadId,
            datasetName || "Unknown Dataset",
            user._id.toString()
          );
        }
      } catch (notificationError) {
        // Don't fail the upload if notification creation fails
        console.error("Failed to create upload notification:", notificationError);
      }
    }

    return NextResponse.json({ success: true, modified: result_op.modifiedCount > 0 });

  } catch (error) {
    console.error("POST /api/upload-status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update upload status" },
      { status: 500 }
    );
  }
}
