import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import { updateUserLastLogin } from "@/lib/models";

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

  // Update logins and lastLogin
  await updateUserLastLogin(user._id.toString());

  // Clean up OTP
  await db.collection("otps").deleteMany({ email });

  // Create JWT token with proper NextAuth format
  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    token: {
      name: user.name || user.email,
      email: user.email,
      sub: user._id.toString(),
      accessLevel: user.accessLevel,
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
      jti: crypto.randomUUID(), // Add unique identifier
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  // Set session cookie with proper NextAuth naming
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  
  const cookieName = isProduction 
    ? "__Secure-next-auth.session-token" 
    : "next-auth.session-token";
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };
  
  cookieStore.set(cookieName, token, cookieOptions);

  return NextResponse.json({ success: true });
}