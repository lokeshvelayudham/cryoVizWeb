import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  category: 'ui' | 'functionality' | 'performance' | 'data' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rating?: number;
}

// ---------- GET - Fetch user's feedback ----------
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Get user ID from email
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch user's feedback, sorted by creation date (newest first)
    const feedback = await db.collection("feedback")
      .find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 feedback items
      .toArray();

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

// ---------- POST - Create new feedback ----------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, category, priority, title, description, rating }: FeedbackData = body;

    // Validate required fields
    if (!type || !category || !priority || !title || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate enum values
    const validTypes = ['bug', 'feature', 'improvement', 'general'];
    const validCategories = ['ui', 'functionality', 'performance', 'data', 'other'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!validPriorities.includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user details
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create feedback document
    const feedback = {
      userId: user._id.toString(),
      userEmail: session.user.email,
      userName: session.user.name || session.user.email,
      type,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
      rating: rating || undefined,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("feedback").insertOne(feedback);
    
    return NextResponse.json({ 
      success: true, 
      id: result.insertedId.toString(),
      message: "Feedback submitted successfully"
    });
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

// ---------- PUT - Update feedback status (admin only) ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { feedbackId, status, adminResponse } = body;

    if (!feedbackId || !status) {
      return NextResponse.json({ error: "Missing feedback ID or status" }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['pending', 'in-progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if user is admin
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Update feedback
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date()
    };

    if (adminResponse) {
      updateData.adminResponse = adminResponse;
      updateData.adminResponseAt = new Date();
    }

    const result = await db.collection("feedback").updateOne(
      { _id: new ObjectId(feedbackId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
  }
}

// ---------- DELETE - Delete feedback (user can delete their own, admin can delete any) ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get("id");

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user details
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can delete this feedback
    const feedback = await db.collection("feedback").findOne({ _id: new ObjectId(feedbackId) });
    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // User can only delete their own feedback, admin can delete any
    if (feedback.userId !== user._id.toString() && user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete feedback
    const result = await db.collection("feedback").deleteOne({
      _id: new ObjectId(feedbackId)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/feedback error:", error);
    return NextResponse.json({ error: "Failed to delete feedback" }, { status: 500 });
  }
}
