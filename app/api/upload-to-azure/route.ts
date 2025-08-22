import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BlobServiceClient, BlobSASPermissions } from "@azure/storage-blob";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadId = formData.get("uploadId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!uploadId) {
      return NextResponse.json({ error: "No upload ID provided" }, { status: 400 });
    }

    // Get Azure connection string
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      return NextResponse.json({ error: "Azure storage not configured" }, { status: 500 });
    }

    const tempContainerName = process.env.AZURE_TEMP_CONTAINER || "temp-uploads";

    // Create blob service client
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    
    // Use temp container for temporary uploads
    const containerClient = blobServiceClient.getContainerClient(tempContainerName);
    
    // Create unique blob name with upload ID
    const timestamp = Date.now();
    const blobName = `temp/${uploadId}/${timestamp}_${file.name}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload file to Azure
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: file.type,
      },
    });

    // Generate temporary access URL (valid for 1 hour)
    const sasToken = await blockBlobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"), // read permission
      expiresOn: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Return the temporary URL
    return NextResponse.json({
      success: true,
      tempUrl: sasToken,
      blobName: blobName,
      message: "File uploaded to Azure successfully"
    });

  } catch (error) {
    console.error("Error uploading to Azure:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload to Azure" },
      { status: 500 }
    );
  }
}
