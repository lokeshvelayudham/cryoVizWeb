"use client";

import { SessionProvider } from "next-auth/react";
import { SessionRecovery } from "@/components/SessionRecovery";
import { ServerSessionSync } from "@/components/ServerSessionSync";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SessionRecovery />
      <ServerSessionSync />
      {children}
    </SessionProvider>
  );
}