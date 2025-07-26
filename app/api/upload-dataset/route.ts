import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  // Uncomment authentication if needed
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
      const errorData = await pythonServerResponse.text(); // Use text() to handle non-JSON responses
      console.error("Python server error:", errorData);
      return NextResponse.json(
        { error: errorData || "Failed to process dataset in Python server" },
        { status: pythonServerResponse.status }
      );
    }

    const {
      datasetId,
      brightfieldBlobUrl,
      fluorescentBlobUrl,
      alphaBlobUrl,
      liverTiffBlobUrl,
      tumorTiffBlobUrl,
      brightfieldNumZ,
      brightfieldNumY,
      brightfieldNumX,
      fluorescentNumZ,
      fluorescentNumY,
      fluorescentNumX,
      ...metadata
    } = await pythonServerResponse.json();

    // Use the request URL to construct an absolute path
    const baseUrl = request.url.substring(0, request.url.indexOf("/api/upload-dataset"));
    const adminUrl = `${baseUrl}/api/admin`;

    const adminResponse = await fetch(adminUrl, {
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
        brightfieldNumZ,
        brightfieldNumY,
        brightfieldNumX,
        fluorescentNumZ,
        fluorescentNumY,
        fluorescentNumX,
      }),
    });

    const adminResult = await adminResponse.json();
    if (adminResponse.ok) {
      return NextResponse.json({ success: true, id: adminResult.id });
    } else {
      console.error("Admin endpoint error:", adminResult.error);
      return NextResponse.json(
        { success: false, error: adminResult.error || "Failed to save dataset in database" },
        { status: adminResponse.status }
      );
    }
  } catch (error: any) {
    console.error("Error uploading dataset:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}