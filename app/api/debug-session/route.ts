import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // Find NextAuth cookies
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('next-auth') || cookie.name.includes('__Secure-next-auth')
    );
    
    return NextResponse.json({
      session,
      sessionExists: !!session,
      authCookies: authCookies.map(c => ({ name: c.name, exists: true })),
      environment: process.env.NODE_ENV,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
