import { BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const connectionString = process.env.MONGODB_URI;
if (!connectionString) {
  throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(connectionString);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    if (!dataset) {
      return NextResponse.json({ error: "Dataset is required" }, { status: 400 });
    }

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection("media");

    const files = await mediaCollection
      .find({ dataset })
      .toArray()
      .then((docs) =>
        docs.map((doc) => ({
          id: doc._id.toString(),
          name: doc.name,
          tag: doc.format,
          url: doc.URL,
        }))
      );

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error("Error listing files:", error.message);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { dataset, filename, format, url, chunkSize, length, user } = await req.json();
    if (!dataset || !filename || !format || !url || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection("media");

    const uploadDate = new Date();
    const metadata = {
      name: filename,
      upload_date: uploadDate,
      dataset,
      format,
      URL: url,
      chunkSize,
      length,
      uploadDate,
      user: user,
    };

    await mediaCollection.insertOne(metadata);
    return NextResponse.json({ message: "Metadata saved", metadata });
  } catch (error: any) {
    console.error("Error saving metadata:", error.message);
    return NextResponse.json({ error: "Failed to save metadata" }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    const filename = searchParams.get("filename");
    if (!dataset || !filename) {
      return NextResponse.json({ error: "Dataset and filename are required" }, { status: 400 });
    }

    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("media");
    const blobClient = containerClient.getBlockBlobClient(`${dataset}/${filename}`);
    await blobClient.deleteIfExists();

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection("media");
    await mediaCollection.deleteOne({ dataset, name: filename });

    return NextResponse.json({ message: "File and metadata deleted" });
  } catch (error: any) {
    console.error("Error deleting file:", error.message);
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  } finally {
    await client.close();
  }
}
