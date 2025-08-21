import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------- GET - Fetch all feedback (admin only) ----------
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Check if user is admin
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || user.accessLevel !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Fetch all feedback, sorted by creation date (newest first)
    const feedback = await db.collection("feedback")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 feedback items
      .toArray();

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("GET /api/feedback/admin error:", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}
