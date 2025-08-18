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

  // Create JWT token
  const token = await encode({
    token: {
      name: user.name || user.email,
      email: user.email,
      sub: user._id.toString(),
      accessLevel: user.accessLevel,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  // Set token cookie with proper configuration for Vercel
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  
  // Use the same cookie name pattern as NextAuth.js
  const cookieName = isProduction 
    ? "__Secure-next-auth.session-token" 
    : "next-auth.session-token";
    
  // Log cookie setting for debugging
  console.log(`Setting cookie: ${cookieName} for ${email} in ${process.env.NODE_ENV}`);
    
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days to match session maxAge
    // Don't set domain - let NextAuth.js handle this
  });

  return NextResponse.json({ success: true });
}