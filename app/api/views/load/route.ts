import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// ----- Helpers -----
const toJsonErr = (e: unknown) =>
  e instanceof Error ? { error: e.message } : { error: "Unknown error" };

export async function POST(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const datasetId = url.searchParams.get("datasetId");
    const { user } = await req.json();

    if (!id || !user || !datasetId) {
      return NextResponse.json({ error: "id, user, and datasetId are required" }, { status: 400 });
    }

    const view = await db.collection("views").findOne({
      _id: new ObjectId(id),
      datasetId,
    });
    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    const loadStats = view.loadStats || [];
    const userStat = loadStats.find((stat: { user: string }) => stat.user === user);
    const updatedStats = userStat
      ? loadStats.map((stat: { user: string; count: number; lastLoad: Date }) =>
          stat.user === user
            ? { ...stat, count: stat.count + 1, lastLoad: new Date() }
            : stat
        )
      : [...loadStats, { user, count: 1, lastLoad: new Date() }];

    const result = await db.collection("views").updateOne(
      { _id: new ObjectId(id), datasetId },
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
    console.error("Error loading view:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(toJsonErr(error), { status: 500 });
  }
}