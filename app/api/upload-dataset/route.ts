import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

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

// Configure route for long-running uploads
export const maxDuration = 300; // 5 minutes
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const uploadId = crypto.randomUUID();
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const datasetName = formData.get("name") as string;
    
    // Initialize upload status
    await updateUploadStatus(uploadId, session.user.email, {
      status: "processing",
      progress: 10,
      message: "Starting dataset processing...",
      datasetName,
    });
    
    // Update progress
    await updateUploadStatus(uploadId, session.user.email, {
      status: "processing",
      progress: 30,
      message: "Processing TIFF files...",
    });

    const pythonServerResponse = await fetch("http://localhost:8000/process-dataset", {
      method: "POST",
      body: formData,
    });

    if (!pythonServerResponse.ok) {
      const errorData = await pythonServerResponse.text();
      console.error("Python server error:", errorData);
      
      // Update status to failed
      await updateUploadStatus(uploadId, session.user.email, {
        status: "failed",
        progress: 0,
        message: "Python processing failed",
        error: errorData,
      });
      
      return NextResponse.json(
        { error: errorData || "Failed to process dataset in Python server", uploadId },
        { status: pythonServerResponse.status }
      );
    }

    const {
      datasetId,
      name,
      description,
      institutionId,
      brightfieldBlobUrl,
      fluorescentBlobUrl,
      spacing,
      brightfieldNumZ,
      brightfieldNumY,
      brightfieldNumX,
      fluorescentNumZ,
      fluorescentNumY,
      fluorescentNumX,
    } = await pythonServerResponse.json();

    // Determine which modalities were actually processed
    const processedModalities = [];
    if (brightfieldBlobUrl) processedModalities.push('brightfield');
    if (fluorescentBlobUrl) processedModalities.push('fluorescent');
    
    const hasProcessedData = processedModalities.length > 0;

    // Use the request URL to construct an absolute path
    const baseUrl = request.url.substring(0, request.url.indexOf("/api/upload-dataset"));
    const adminUrl = `${baseUrl}/api/admin`;

    // Build clean payload with only essential data
    const payload = {
      action: "dataset",
      datasetId,
      name,
      description,
      institutionId,
      brightfieldBlobUrl,
      fluorescentBlobUrl,
      spacing,
      brightfieldNumZ,
      brightfieldNumY,
      brightfieldNumX,
      fluorescentNumZ,
      fluorescentNumY,
      fluorescentNumX,
    };

    console.log(`Processing complete - Modalities: ${processedModalities.join(', ') || 'none'}, Has processed data: ${hasProcessedData}`);

    // Update progress - saving to database
    await updateUploadStatus(uploadId, session.user.email, {
      status: "processing",
      progress: 80,
      message: "Saving dataset to database...",
    });

    const adminResponse = await fetch(adminUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const adminResult = await adminResponse.json();
    if (adminResponse.ok) {
      // Update status to completed
      await updateUploadStatus(uploadId, session.user.email, {
        status: "completed",
        progress: 100,
        message: "Dataset uploaded successfully!",
        completedAt: new Date(),
        result: { datasetId: adminResult.id },
      });

      return NextResponse.json({ success: true, id: adminResult.id, uploadId });
    } else {
      console.error("Admin endpoint error:", adminResult.error);
      
      // Update status to failed
      await updateUploadStatus(uploadId, session.user.email, {
        status: "failed",
        progress: 0,
        message: "Failed to save dataset",
        completedAt: new Date(),
        error: adminResult.error,
      });
      
      return NextResponse.json(
        { success: false, error: adminResult.error || "Failed to save dataset in database", uploadId },
        { status: adminResponse.status }
      );
    }
  } catch (error) {
    console.error("Error uploading dataset:", error instanceof Error ? error.message : "Unknown error");
    console.error("Full error details:", error);
    
    // Try to update status to failed (best effort)
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        await updateUploadStatus(uploadId, session.user.email, {
          status: "failed",
          progress: 0,
          message: "Upload failed",
          completedAt: new Date(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (statusError) {
      console.error("Error updating status on failure:", statusError);
    }
    
    return NextResponse.json({ ...toJsonErr(error), uploadId }, { status: 500 });
  }
}