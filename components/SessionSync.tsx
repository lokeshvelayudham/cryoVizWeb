"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function SessionSync() {
  const { status } = useSession();
  const [syncAttempted, setSyncAttempted] = useState(false);
    const [isLoading, ] = useState(true);

  useEffect(() => {
    const syncSession = async () => {
      // Only attempt sync once per page load and only if unauthenticated
      if (status === "unauthenticated" && !syncAttempted) {
        setSyncAttempted(true);
        
        try {
          console.log("🔄 SessionSync: Client unauthenticated, checking server...");
          
          // Check if server has a session
          const response = await fetch("/api/test-session", {
            credentials: "include",
            cache: "no-store"
          });
          
          const data = await response.json();
          
          if (data.sessionExists && data.serverSession) {
            console.log("🔄 SessionSync: Server has session, client doesn't - reloading page...");
            // Just reload the page - this is the most reliable way to sync
            window.location.reload();
          } else {
            console.log("🔄 SessionSync: Server also has no session - user needs to login");
          }
        } catch (error) {
          console.error("🔄 SessionSync: Error:", error);
        }
      }
    };

    // Only run if status is not loading
    if (status !== "loading") {
      syncSession();
    }
  }, [status, syncAttempted]);

  // Show loading indicator if syncing
  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span className="text-sm">Syncing session...</span>
        </div>
      </div>
    );
  }

  return null;
}
