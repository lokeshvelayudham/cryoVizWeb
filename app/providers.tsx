"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import type { Session } from "next-auth";

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

export function Providers({ children, session }: { children: React.ReactNode, session: Session | null }) {
  // Debug session passing from server to client
  React.useEffect(() => {
    console.log("🔄 Providers - Server session passed to client:", session);
    console.log("🔄 Providers - Session exists:", !!session);
    if (session) {
      console.log("🔄 Providers - Session user:", session.user);
      console.log("🔄 Providers - Session expires:", session.expires);
    }
  }, [session]);

  return (
    <SessionProvider 
      session={session} 
      refetchInterval={0} // Disable automatic refetching to prevent session loss
      refetchOnWindowFocus={false} // Disable focus refresh to prevent session interruption
      refetchWhenOffline={false}
      basePath="/api/auth" // Explicitly set the auth base path
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}