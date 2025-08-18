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
  return (
    <SessionProvider 
      session={session} 
      refetchInterval={60} // Check every 1 minute for better session recovery
      refetchOnWindowFocus={true} // Re-enable focus refresh for better session recovery
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