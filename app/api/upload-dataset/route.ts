import { NextResponse } from "next/server";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

export async function POST(request: Request) {
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
  } catch (error) {
    console.error("Error uploading dataset:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(toJsonErr(error), { status: 500 });
  }
}