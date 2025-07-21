import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

interface Annotation {
  _id?: string;
  id: string;
  view: string;
  slice: number;
  x: number;
  y: number;
  text: string;
  instance: number;
  datetime: number;
  user: string;
  dataset: string;
  status: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const annotations = await db
      .collection("annotations")
      .find({ dataset: "Brain", user: userEmail, status: "active" })
      .toArray();

    const formattedAnnotations = annotations.map((item) => ({
      ...item,
      _id: item._id.toString(),
    }));

    console.log("GET annotations:", formattedAnnotations.map(a => ({ _id: a._id, id: (a as Annotation).id, user: (a as Annotation).user })));
    return NextResponse.json(formattedAnnotations, { status: 200 });
  } catch (error) {
    console.error("Error fetching annotations:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to fetch annotations: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const annotation: Annotation = await req.json();
    console.log("POST request payload:", { id: annotation.id, user: userEmail, text: annotation.text });

    if (!annotation.text || typeof annotation.text !== "string" || annotation.text.trim() === "") {
      return NextResponse.json({ error: "Annotation text cannot be empty" }, { status: 400 });
    }

    if (!annotation.view || !annotation.slice || !annotation.id || !annotation.dataset || !annotation.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("annotations").insertOne({
      id: annotation.id,
      view: annotation.view,
      slice: annotation.slice,
      x: annotation.x,
      y: annotation.y,
      text: annotation.text,
      instance: annotation.instance,
      user: userEmail,
      datetime: Date.now(),
      dataset: "Brain", 
      status: "active"
    });

    console.log("POST result:", { insertedId: result.insertedId.toString(), id: annotation.id });
    return NextResponse.json({ _id: result.insertedId.toString(), id: annotation.id }, { status: 201 });
  } catch (error) {
    console.error("Error saving annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to save annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to save annotation" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const annotation: Partial<Annotation> & { _id?: string; id: string } = await req.json();
    console.log("PUT request payload:", { _id: annotation._id, id: annotation.id, user: userEmail, text: annotation.text, x: annotation.x, y: annotation.y });

    if (!annotation.text || typeof annotation.text !== "string" || annotation.text.trim() === "") {
      return NextResponse.json({ error: "Annotation text cannot be empty" }, { status: 400 });
    }

    if (!annotation._id && !annotation.id) {
      return NextResponse.json({ error: "Missing _id or id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const query = annotation._id
      ? { _id: new ObjectId(annotation._id), user: userEmail, dataset: "Brain", status: "active" }
      : { id: annotation.id, user: userEmail, dataset: "Brain", status: "active" };

    console.log("PUT query:", query);

    const existingAnnotations = await db.collection("annotations").find(query).toArray();
    console.log("Existing annotations:", existingAnnotations.map(a => ({ _id: a._id.toString(), id: a.id, user: a.user })));

    if (existingAnnotations.length === 0) {
      console.error("Annotation not found:", { _id: annotation._id, id: annotation.id, user: userEmail });
      return NextResponse.json({ error: "Annotation not found or not owned by user" }, { status: 404 });
    }

    const updateData = {
      x: annotation.x,
      y: annotation.y,
      text: annotation.text,
      datetime: annotation.datetime || Date.now(),
    };

    const result = await db.collection("annotations").updateOne(
      query,
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      console.error("No documents matched for update:", { _id: annotation._id, id: annotation.id, user: userEmail });
      return NextResponse.json({ error: "Annotation not found or not owned by user" }, { status: 404 });
    }

    console.log("Annotation updated:", { _id: annotation._id, id: annotation.id, user: userEmail });
    return NextResponse.json({ message: "Annotation updated successfully", id: annotation.id }, { status: 200 });
  } catch (error) {
    console.error("Error updating annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to update annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to update annotation" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json({ error: "Missing _id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("annotations").deleteOne({
      _id: new ObjectId(_id),
      user: userEmail,
      dataset: "Brain",
      status: "active",
    });

    if (result.deletedCount === 0) {
      console.error("Annotation not found for deletion:", { _id, user: userEmail });
      return NextResponse.json({ error: "Annotation not found or not owned by user" }, { status: 404 });
    }

    console.log("Annotation deleted:", { _id, user: userEmail });
    return NextResponse.json({ message: "Annotation deleted successfully", _id }, { status: 200 });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: `Failed to delete annotation: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to delete annotation" }, { status: 500 });
  }
}
