import { BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

// ----- Mongo setup -----
const connectionString = process.env.MONGODB_URI;
if (!connectionString) {
  throw new Error("MONGODB_URI is not set");
}
const client = new MongoClient(connectionString);

// ----- Types -----
type MediaDoc = {
  _id: ObjectId;
  name: string;
  dataset: string;
  format: string;
  URL: string;
  chunkSize?: number;
  length?: number;
  uploadDate: Date;
  user: string;
};

type ListFile = {
  id: string;
  name: string;
  tag: string;
  url: string;
};

type PostBody = {
  dataset: string;
  filename: string;
  format: string;
  url: string;
  chunkSize?: number;
  length?: number;
  user: string;
};

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

// ----- GET -----
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    if (!dataset) {
      return NextResponse.json({ error: "Dataset is required" }, { status: 400 });
    }

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection<MediaDoc>("media");

    const docs = await mediaCollection.find({ dataset }).toArray();

    const files: ListFile[] = docs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      tag: doc.format,
      url: doc.URL,
    }));

    return NextResponse.json({ files });
  } catch (e: unknown) {
    console.error("Error listing files:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  } finally {
    await client.close();
  }
}

// ----- POST -----
export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== "object" ||
      typeof (body as PostBody).dataset !== "string" ||
      typeof (body as PostBody).filename !== "string" ||
      typeof (body as PostBody).format !== "string" ||
      typeof (body as PostBody).url !== "string" ||
      typeof (body as PostBody).user !== "string"
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { dataset, filename, format, url, chunkSize, length, user } = body as PostBody;

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection<MediaDoc>("media");

    const uploadDate = new Date();
    const metadata: Omit<MediaDoc, "_id"> = {
      name: filename,
      uploadDate,
      dataset,
      format,
      URL: url,
      chunkSize,
      length,
      user,
    };

    await mediaCollection.insertOne(metadata as unknown as MediaDoc);
    return NextResponse.json({ message: "Metadata saved", metadata });
  } catch (e: unknown) {
    console.error("Error saving metadata:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  } finally {
    await client.close();
  }
}

// ----- DELETE -----
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dataset = searchParams.get("dataset");
    const filename = searchParams.get("filename");
    if (!dataset || !filename) {
      return NextResponse.json({ error: "Dataset and filename are required" }, { status: 400 });
    }

    const storageConn = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!storageConn) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(storageConn);
    const containerClient = blobServiceClient.getContainerClient("media");
    const blobClient = containerClient.getBlockBlobClient(`${dataset}/${filename}`);
    await blobClient.deleteIfExists();

    await client.connect();
    const db = client.db();
    const mediaCollection = db.collection<MediaDoc>("media");
    await mediaCollection.deleteOne({ dataset, name: filename });

    return NextResponse.json({ message: "File and metadata deleted" });
  } catch (e: unknown) {
    console.error("Error deleting file:", e);
    return NextResponse.json(toJsonErr(e), { status: 500 });
  } finally {
    await client.close();
  }
}