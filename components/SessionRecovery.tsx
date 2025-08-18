"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionRecovery() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    const checkAndRecoverSession = async () => {
      // If client thinks we're unauthenticated, but we might have server session
      if (status === "unauthenticated") {
        console.log("SessionRecovery: Attempting to recover session...");
        
        try {
          // Check if server has a session
          const response = await fetch("/api/debug-session");
          const debugData = await response.json();
          
          if (debugData.sessionExists && !session) {
            console.log("SessionRecovery: Server has session, forcing client refresh...");
            // Force session update
            await update();
            // If that doesn't work, refresh the page
            setTimeout(() => {
              if (status === "unauthenticated") {
                console.log("SessionRecovery: Manual refresh required");
                router.refresh();
              }
            }, 2000);
          }
        } catch (error) {
          console.error("SessionRecovery: Error checking session:", error);
        }
      }
    };

    // Only run if we're in an unauthenticated state
    if (status === "unauthenticated") {
      checkAndRecoverSession();
    }
  }, [status, session, update, router]);

  // This component doesn't render anything
  return null;
}
