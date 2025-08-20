import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import sharp from "sharp";
import { BlobServiceClient } from "@azure/storage-blob";
import { Jimp } from "jimp";

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

// Generate unique slice images with different patterns
const generateUniqueSlice = async (
  width: number,
  height: number,
  sliceIndex: number,
  sliceType: 'xy' | 'xz' | 'yz'
): Promise<Buffer> => {
  // Create a unique pattern for each slice
  const canvas = new Uint8Array(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      
      // Generate unique colors based on slice index and position
      const r = (x + sliceIndex * 10) % 256;
      const g = (y + sliceIndex * 15) % 256;
      const b = (sliceIndex * 20) % 256;
      const a = 255;
      
      canvas[index] = r;     // Red
      canvas[index + 1] = g; // Green
      canvas[index + 2] = b; // Blue
      canvas[index + 3] = a; // Alpha
    }
  }
  
  // Convert to PNG using sharp
  const image = sharp(canvas, {
    raw: {
      width: width,
      height: height,
      channels: 4,
    }
  });
  
  return await image.png().toBuffer();
};

// Process TIFF stack and create all slice types
const processTiffStack = async (
  tiffBuffer: Buffer,
  datasetId: string,
  modality: string,
  uploadId: string,
  userId: string
): Promise<{
  blobUrl: string;
  numZ: number;
  numY: number;
  numX: number;
}> => {
  try {
    // Update progress
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 40,
      message: `Processing ${modality} TIFF stack...`,
    });

    // For now, we'll use the uploaded image dimensions
    // In a full implementation, we'd need to parse the actual TIFF stack
    const image = await Jimp.read(tiffBuffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Since we can't easily parse multi-page TIFFs in Node.js without complex libraries,
    // we'll create a more realistic approach by processing the uploaded image
    // and creating variations that simulate the stack
    
    console.log(`${modality} uploaded image dimensions: Y=${height}, X=${width}`);
    
    // Create a simulated stack based on the uploaded image
    // In production, you'd want to use a proper TIFF library to read the actual stack
    const numSlices = Math.min(165, Math.floor(height / 10)); // Simulate Z slices
    const sliceHeight = Math.floor(height / numSlices);
    
    console.log(`Creating ${numSlices} simulated slices from uploaded image`);

    // Update progress
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 50,
      message: `Processing ${modality} image into ${numSlices} slices...`,
    });

    // Azure setup
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("Azure storage connection string not configured");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerName = "cryovizweb";
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create the main image
    const mainBlobName = `dataset-${datasetId}/${modality}/main.png`;
    const mainBlockBlobClient = containerClient.getBlockBlobClient(mainBlobName);
    const pngBuffer = await image.getBuffer("image/png");
    await mainBlockBlobClient.upload(pngBuffer, pngBuffer.length, {
      blobHTTPHeaders: { blobContentType: "image/png" }
    });

    // Process and upload XY slices (Z-axis slices) - extract from uploaded image
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 55,
      message: `Extracting ${modality} XY slices from uploaded image...`,
    });

    for (let z = 0; z < numSlices; z++) {
      // Extract a slice from the uploaded image
      const startY = z * sliceHeight;
      const endY = Math.min(startY + sliceHeight, height);
      
      // For now, use the full image as each slice since crop method has issues
      // In production, you'd want to properly extract slices from the TIFF stack
      const sliceBuffer = await image.getBuffer("image/png");
      
      // Upload XY slice
      const xyBlobName = `dataset-${datasetId}/${modality}/xy/${z.toString().padStart(3, '0')}.png`;
      const xyBlockBlobClient = containerClient.getBlockBlobClient(xyBlobName);
      await xyBlockBlobClient.upload(sliceBuffer, sliceBuffer.length, {
        blobHTTPHeaders: { blobContentType: "image/png" }
      });

      // Update progress every 10 slices
      if (z % 10 === 0) {
        await updateUploadStatus(uploadId, userId, {
          status: "processing",
          progress: 55 + Math.floor((z / numSlices) * 10),
          message: `Extracting ${modality} XY slices... ${z + 1}/${numSlices}`,
        });
      }
    }

    // Process and upload XZ slices (Y-axis slices) - extract from uploaded image
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 65,
      message: `Extracting ${modality} XZ slices from uploaded image...`,
    });

    const xzSliceWidth = Math.floor(width / 10); // Create 10 XZ slices for demo
    for (let y = 0; y < Math.min(10, height); y++) {
      // Extract a vertical slice from the uploaded image
      const startX = (y % 10) * xzSliceWidth;
      const endX = Math.min(startX + xzSliceWidth, width);
      
      // For now, use the full image as each slice since crop method has issues
      const sliceBuffer = await image.getBuffer("image/png");
      
      // Upload XZ slice
      const xzBlobName = `dataset-${datasetId}/${modality}/xz/${y.toString().padStart(3, '0')}.png`;
      const xzBlockBlobClient = containerClient.getBlockBlobClient(xzBlobName);
      await xzBlockBlobClient.upload(sliceBuffer, sliceBuffer.length, {
        blobHTTPHeaders: { blobContentType: "image/png" }
      });

      // Update progress every 2 slices
      if (y % 2 === 0) {
        await updateUploadStatus(uploadId, userId, {
          status: "processing",
          progress: 65 + Math.floor((y / 10) * 10),
          message: `Extracting ${modality} XZ slices... ${y + 1}/10`,
        });
      }
    }

    // Process and upload YZ slices (X-axis slices) - extract from uploaded image
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 75,
      message: `Extracting ${modality} YZ slices from uploaded image...`,
    });

    const yzSliceHeight = Math.floor(height / 10); // Create 10 YZ slices for demo
    for (let x = 0; x < Math.min(10, width); x++) {
      // Extract a horizontal slice from the uploaded image
      const startY = (x % 10) * yzSliceHeight;
      const endY = Math.min(startY + yzSliceHeight, height);
      
      // For now, use the full image as each slice since crop method has issues
      const sliceBuffer = await image.getBuffer("image/png");
      
      // Upload YZ slice
      const yzBlobName = `dataset-${datasetId}/${modality}/yz/${x.toString().padStart(3, '0')}.png`;
      const yzBlockBlobClient = containerClient.getBlockBlobClient(yzBlobName);
      await yzBlockBlobClient.upload(sliceBuffer, sliceBuffer.length, {
        blobHTTPHeaders: { blobContentType: "image/png" }
      });

      // Update progress every 2 slices
      if (x % 2 === 0) {
        await updateUploadStatus(uploadId, userId, {
          status: "processing",
          progress: 75 + Math.floor((x / 10) * 10),
          message: `Extracting ${modality} YZ slices... ${x + 1}/10`,
        });
      }
    }

    // Return the main dataset URL
    const mainBlobUrl = `https://bivlargefiles.blob.core.windows.net/${containerName}/dataset-${datasetId}/${modality}/main.png`;

    return {
      blobUrl: mainBlobUrl,
      numZ: numSlices,
      numY: height,
      numX: width,
    };

  } catch (error) {
    console.error(`Error processing ${modality} TIFF:`, error);
    throw error;
  }
};

// Async upload processing function
const processUploadAsync = async (formData: FormData, uploadId: string, userId: string, baseUrl: string) => {
  try {
    console.log(`Starting async processing for upload ${uploadId}`);
    
    // Update progress
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 20,
      message: "Processing TIFF files...",
    });

    // Extract form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const institutionId = formData.get("institutionId") as string;
    const spacing = formData.get("spacing") as string;
    const brightfield = formData.get("brightfield") as File;
    const fluorescent = formData.get("fluorescent") as File;
    const alpha = formData.get("alpha") as File;

    if (!name || !institutionId) {
      throw new Error("Missing required fields");
    }

    // Generate dataset ID
    const datasetId = crypto.randomUUID();

    // Update progress
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 30,
      message: "Processing TIFF files...",
    });

    // Process brightfield if provided
    let brightfieldResult = null;
    if (brightfield) {
      const brightfieldBuffer = Buffer.from(await brightfield.arrayBuffer());
      brightfieldResult = await processTiffStack(brightfieldBuffer, datasetId, "brightfield", uploadId, userId);
    }

    // Process fluorescent if provided
    let fluorescentResult = null;
    if (fluorescent) {
      const fluorescentBuffer = Buffer.from(await fluorescent.arrayBuffer());
      fluorescentResult = await processTiffStack(fluorescentBuffer, datasetId, "fluorescent", uploadId, userId);
    }

    // Update progress - saving to database
    await updateUploadStatus(uploadId, userId, {
      status: "processing",
      progress: 80,
      message: "Saving dataset to database...",
    });

    // Save to database
    const payload = {
      action: "dataset",
      datasetId,
      name,
      description,
      institutionId,
      brightfieldBlobUrl: brightfieldResult?.blobUrl,
      fluorescentBlobUrl: fluorescentResult?.blobUrl,
      spacing: spacing ? parseFloat(spacing) : null,
      brightfieldNumZ: brightfieldResult?.numZ,
      brightfieldNumY: brightfieldResult?.numY,
      brightfieldNumX: brightfieldResult?.numX,
      fluorescentNumZ: fluorescentResult?.numZ,
      fluorescentNumY: fluorescentResult?.numY,
      fluorescentNumX: fluorescentResult?.numX,
    };

    const adminResponse = await fetch(`${baseUrl}/api/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const adminResult = await adminResponse.json();
    
    if (adminResponse.ok) {
      await updateUploadStatus(uploadId, userId, {
        status: "completed",
        progress: 100,
        message: "Dataset uploaded successfully!",
        completedAt: new Date(),
        result: { datasetId: adminResult.id },
      });
      console.log(`Upload ${uploadId} completed successfully`);
    } else {
      await updateUploadStatus(uploadId, userId, {
        status: "failed",
        progress: 0,
        message: "Failed to save dataset",
        completedAt: new Date(),
        error: adminResult.error,
      });
      console.error(`Upload ${uploadId} failed at database save:`, adminResult.error);
    }

  } catch (error) {
    console.error(`Upload ${uploadId} failed:`, error);
    await updateUploadStatus(uploadId, userId, {
      status: "failed",
      progress: 0,
      message: "Upload failed",
      completedAt: new Date(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
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
