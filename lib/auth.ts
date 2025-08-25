import type { NextAuthOptions } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessLevel?: string;
    };
  }

  interface User {
    accessLevel?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessLevel?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Custom OTP authentication - no NextAuth providers needed
    // We handle authentication through /api/auth/request-otp and /api/auth/verify-otp
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET!,
    maxAge: 7 * 24 * 60 * 60, // 7 days to match session maxAge
  },
  
  adapter: MongoDBAdapter(clientPromise),
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      // If this is the first time the JWT is created (sign in)
      if (user && 'accessLevel' in user) {
        token.accessLevel = user.accessLevel as string;
      }
      
      // Ensure token has required fields for persistence
      if (!token.sub && user?.id) {
        token.sub = user.id;
      }
      
      // Add timestamp for debugging
      if (process.env.NODE_ENV === "development") {
        token.lastUpdated = Date.now();
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.accessLevel = token.accessLevel as string;
        // Ensure name is set properly
        if (!session.user.name && session.user.email) {
          session.user.name = session.user.email;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url && url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      try {
        if (url && new URL(url).origin === baseUrl) return url;
      } catch {
        // If URL parsing fails, return baseUrl
      }
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Required: for both GET/POST and session-based auth
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
