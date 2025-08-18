"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export function ServerSessionSync() {
  const { data: clientSession, status } = useSession();
  const [serverSession, setServerSession] = useState<any>(null);
  const [syncAttempted, setSyncAttempted] = useState(false);

  useEffect(() => {
    const syncServerSession = async () => {
      if (status === "unauthenticated" && !syncAttempted) {
        setSyncAttempted(true);
        
        try {
          console.log("ServerSessionSync: Checking server session...");
          
          // Fetch session directly from server
          const response = await fetch("/api/debug-session", {
            method: "GET",
            credentials: "include", // Ensure cookies are sent
            cache: "no-store"
          });
          
          const debugData = await response.json();
          console.log("ServerSessionSync: Server response:", debugData);
          
          if (debugData.sessionExists && debugData.session) {
            setServerSession(debugData.session);
            console.log("ServerSessionSync: Server session found:", debugData.session.user?.email);
            
            // Try to force NextAuth to recognize this session
            // by triggering a session endpoint call with proper headers
            try {
              const sessionResponse = await fetch("/api/auth/session", {
                method: "GET",
                credentials: "include",
                headers: {
                  "Cache-Control": "no-cache",
                  "Pragma": "no-cache"
                }
              });
              
              const sessionData = await sessionResponse.json();
              console.log("ServerSessionSync: NextAuth session endpoint response:", sessionData);
              
              if (sessionData && sessionData.user) {
                console.log("ServerSessionSync: NextAuth session endpoint has data - forcing page refresh");
                // If the session endpoint has data but useSession doesn't, force a refresh
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } catch (error) {
              console.error("ServerSessionSync: Error calling session endpoint:", error);
            }
          }
        } catch (error) {
          console.error("ServerSessionSync: Error syncing session:", error);
        }
      }
    };

    if (status !== "loading") {
      syncServerSession();
    }
  }, [status, clientSession, syncAttempted]);

  // Show debug info if there's a mismatch
  if (serverSession && !clientSession) {
    return (
      <div className="fixed bottom-4 left-4 bg-orange-500 text-white p-3 rounded-lg shadow-lg max-w-sm z-50">
        <div className="text-sm font-medium mb-1">Session Sync Debug</div>
        <div className="text-xs">
          Server: {serverSession.user?.email || "Unknown"}<br/>
          Client: {clientSession?.user?.email || "None"}
        </div>
      </div>
    );
  }

  return null;
}
