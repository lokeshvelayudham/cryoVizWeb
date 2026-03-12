import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email }
    });

    return NextResponse.json({ exists: !!user });
  } catch (error: any) {
    console.error("Check user error:", error);
    return NextResponse.json({ error: error.message || "Failed to check user" }, { status: 500 });
  }
}