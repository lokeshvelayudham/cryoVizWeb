import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const { user } = await req.json();

    if (!id || !user) {
      return NextResponse.json({ error: "ID and user are required" }, { status: 400 });
    }

    const view = await db.collection("views").findOne({ $or: [{ _id: new ObjectId(id) }, { id }] });
    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    const loadStats = view.loadStats || [];
    const userStat = loadStats.find((stat: any) => stat.user === user);
    const updatedStats = userStat
      ? loadStats.map((stat: any) =>
          stat.user === user
            ? { ...stat, count: stat.count + 1, lastLoad: new Date() }
            : stat
        )
      : [...loadStats, { user, count: 1, lastLoad: new Date() }];

    const result = await db.collection("views").updateOne(
      { $or: [{ _id: new ObjectId(id) }, { id }] },
      { $set: { loadCount: view.loadCount + 1, loadStats: updatedStats } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "View loaded successfully", view: { ...view, loadCount: view.loadCount + 1, loadStats: updatedStats } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error loading view:", error);
    return NextResponse.json({ error: "Failed to load view" }, { status: 500 });
  }
}
