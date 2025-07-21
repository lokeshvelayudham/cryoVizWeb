import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  const client = await clientPromise;
  const db = client.db();

  const match = await db.collection("otps").findOne({ email, otp });
  if (!match) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Clean up OTP
  await db.collection("otps").deleteMany({ email });

  // Create JWT token
  const token = await encode({
    token: {
      name: user.name || user.email,
      email: user.email,
      sub: user._id.toString(),
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  // Set token cookie
  const cookieStore = await cookies();
  cookieStore.set("next-auth.session-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ success: true });
}