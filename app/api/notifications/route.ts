import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch user's notifications ----------
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

    // Fetch user's notifications, sorted by timestamp (newest first)
    const notifications = await db.collection("notifications")
      .find({ userId: user._id.toString() })
      .sort({ timestamp: -1 })
      .limit(50) // Limit to last 50 notifications
      .toArray();

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

// ---------- POST - Create notification (admin/system) ----------
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, title, message, priority = 'medium', metadata } = body;

    // Validate required fields
    if (!userId || !type || !title || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate notification type
    if (!['upload', 'system'].includes(type)) {
      return NextResponse.json({ error: "Invalid notification type" }, { status: 400 });
    }

    // Validate priority
    if (!['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority level" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Verify user exists
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create notification
    const notification = {
      userId,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      priority,
      metadata
    };

    const result = await db.collection("notifications").insertOne(notification);
    
    return NextResponse.json({ 
      success: true, 
      id: result.insertedId.toString() 
    });
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }
}

// ---------- PUT - Mark notification as read ----------
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    if (action === 'mark-read' && !notificationId) {
      return NextResponse.json({ error: "Missing notification ID for mark-read action" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user ID from email
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === 'mark-read') {
      // Mark single notification as read
      const result = await db.collection("notifications").updateOne(
        { _id: new ObjectId(notificationId), userId: user._id.toString() },
        { $set: { read: true } }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }
    } else if (action === 'mark-all-read') {
      // Delete all user's notifications when marking all as read
      await db.collection("notifications").deleteMany(
        { userId: user._id.toString() }
      );
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

// ---------- DELETE - Delete notification ----------
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user ID from email
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete notification (only if it belongs to the user)
    const result = await db.collection("notifications").deleteOne({
      _id: new ObjectId(notificationId),
      userId: user._id.toString()
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
