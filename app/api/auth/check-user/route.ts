// app/api/check-user/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const { email } = await req.json();
  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne({ email });
  return NextResponse.json({ exists: !!user });
}