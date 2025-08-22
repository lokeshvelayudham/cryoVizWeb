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

    // Extract file information
    const brightfield = formData.get("brightfield") as File;
    const fluorescent = formData.get("fluorescent") as File;
    const alpha = formData.get("alpha") as File;

    // Upload files to Azure temporary storage
    const brightfieldTempUrl = brightfield ? await uploadFileToAzure(brightfield, uploadId) : null;
    const fluorescentTempUrl = fluorescent ? await uploadFileToAzure(fluorescent, uploadId) : null;
    const alphaTempUrl = alpha ? await uploadFileToAzure(alpha, uploadId) : null;

    // Create new form data for Python backend
    const pythonFormData = new FormData();
    pythonFormData.append("name", formData.get("name") as string);
    pythonFormData.append("description", formData.get("description") as string);
    pythonFormData.append("institutionId", formData.get("institutionId") as string);
    pythonFormData.append("spacing", formData.get("spacing") as string);
    pythonFormData.append("uploadId", uploadId);
    pythonFormData.append("userId", userId);
    pythonFormData.append("nextBaseUrl", request.nextUrl.origin);

    // Add temporary URLs and filenames
    if (brightfieldTempUrl) {
      pythonFormData.append("brightfieldTempUrl", brightfieldTempUrl);
      pythonFormData.append("brightfieldFilename", brightfield.name);
    }
    if (fluorescentTempUrl) {
      pythonFormData.append("fluorescentTempUrl", fluorescentTempUrl);
      pythonFormData.append("fluorescentFilename", fluorescent.name);
    }
    if (alphaTempUrl) {
      pythonFormData.append("alphaTempUrl", alphaTempUrl);
      pythonFormData.append("alphaFilename", alpha.name);
    }

    // Fire-and-forget: forward to Python processor and return immediately
    const pythonUrl = process.env.PYTHON_PROCESSOR_URL || "https://cryovizwebpy.onrender.com/process-dataset";

    // Do not await; let the request proceed independently
    fetch(pythonUrl, { method: "POST", body: pythonFormData }).catch((e) => {
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

async function uploadFileToAzure(file: File, uploadId: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("uploadId", uploadId);

    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/upload-to-azure`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Azure upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.tempUrl;
  } catch (error) {
    console.error("Error uploading file to Azure:", error);
    throw error;
  }
}
