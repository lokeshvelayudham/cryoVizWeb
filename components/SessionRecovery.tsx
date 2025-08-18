"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SessionRecovery() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  useEffect(() => {
    const checkAndRecoverSession = async () => {
      // Only attempt recovery once per page load
      if (status === "unauthenticated" && !recoveryAttempted) {
        setRecoveryAttempted(true);
        console.log("SessionRecovery: Attempting to recover session...");
        
        try {
          // Check if server has a session
          const response = await fetch("/api/debug-session");
          const debugData = await response.json();
          
          if (debugData.sessionExists && !session) {
            console.log("SessionRecovery: Server has session, forcing client refresh...");
            
            // Multiple recovery strategies
            // Strategy 1: Force session update
            await update();
            
            // Strategy 2: If update doesn't work, try a more aggressive approach
            setTimeout(async () => {
              if (status === "unauthenticated") {
                console.log("SessionRecovery: Trying aggressive recovery...");
                // Clear any cached session data and force re-fetch
                await fetch("/api/auth/session", { 
                  method: "GET", 
                  cache: "no-store",
                  headers: { "Cache-Control": "no-cache" }
                });
                await update();
                
                // Strategy 3: Last resort - hard refresh
                setTimeout(() => {
                  if (status === "unauthenticated") {
                    console.log("SessionRecovery: Hard refresh required - redirecting...");
                    window.location.href = window.location.pathname + window.location.search;
                  }
                }, 1000);
              }
            }, 1000);
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
