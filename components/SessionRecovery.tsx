"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SessionRecovery() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState<string | null>(null);

  useEffect(() => {
    // DISABLED AUTO-RECOVERY TO PREVENT INFINITE LOOPS
    // Only attempt recovery once per page load and ONLY log the issue
    if (status === "unauthenticated" && !recoveryAttempted) {
      setRecoveryAttempted(true);
      console.log("SessionRecovery: Session sync issue detected - manual intervention required");
      
      // Check if server has a session for debugging
      fetch("/api/debug-session")
        .then(response => response.json())
        .then(debugData => {
          if (debugData.sessionExists && !session) {
            console.log("SessionRecovery: Server has session but client doesn't - use manual refresh");
            setRecoveryStage("Session sync issue detected");
            
            // Clear the stage after 3 seconds to not clutter UI
            setTimeout(() => {
              setRecoveryStage(null);
            }, 3000);
          }
        })
        .catch(error => {
          console.error("SessionRecovery: Error checking session:", error);
        });
    }
  }, [status, session, update, router]);

  // Show recovery status if in progress
  if (recoveryStage) {
    return (
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span className="text-sm">{recoveryStage}</span>
        </div>
      </div>
    );
  }

  return null;
}
