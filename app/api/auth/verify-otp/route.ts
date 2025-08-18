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

  // EXPERIMENTAL: Try setting cookies with multiple approaches for Vercel compatibility
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  
  console.log(`Setting cookies for ${email} in ${process.env.NODE_ENV} environment`);
  
  // Set both cookie variants to ensure compatibility
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days to match session maxAge
  };
  
  if (isProduction) {
    // Production: Set secure cookies
    cookieStore.set("__Secure-next-auth.session-token", token, cookieOptions);
    console.log("Set __Secure-next-auth.session-token for production");
  } else {
    // Development: Set non-secure cookies
    cookieStore.set("next-auth.session-token", token, cookieOptions);
    console.log("Set next-auth.session-token for development");
  }
  
  // EXPERIMENTAL: Also try setting a non-httpOnly version for client access testing
  if (isProduction) {
    cookieStore.set("__Secure-next-auth.session-token-readable", token, {
      ...cookieOptions,
      httpOnly: false, // Allow client-side access for debugging
    });
    console.log("Set readable session token for debugging");
  }

  return NextResponse.json({ success: true });
}