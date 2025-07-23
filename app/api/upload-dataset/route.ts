import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  // const session = await getServerSession(authOptions);
  // if (!session) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const formData = await request.formData();
    const pythonServerResponse = await fetch("http://localhost:8000/process-dataset", {
      method: "POST",
      body: formData,
    });

    if (!pythonServerResponse.ok) {
      const errorData = await pythonServerResponse.json();
      return NextResponse.json({ error: errorData.error || "Failed to process dataset" }, { status: pythonServerResponse.status });
    }

    const { datasetId, brightfieldBlobUrl, fluorescentBlobUrl, alphaBlobUrl, liverTiffBlobUrl, tumorTiffBlobUrl, ...metadata } = await pythonServerResponse.json();

    // Use the request URL to construct an absolute path
    const baseUrl = request.url.substring(0, request.url.indexOf("/api/upload-dataset"));
    const adminUrl = `${baseUrl}/api/admin`;

    const response = await fetch(adminUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dataset",
        ...metadata,
        brightfieldBlobUrl,
        fluorescentBlobUrl,
        alphaBlobUrl,
        liverTiffBlobUrl,
        tumorTiffBlobUrl,
      }),
    });

    const result = await response.json();
    if (response.ok) {
      return NextResponse.json({ success: true, id: result.id });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
  } catch (error) {
    console.error("Error uploading dataset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}