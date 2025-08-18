"use client";

import { SessionProvider } from "next-auth/react";
import { SessionRecovery } from "@/components/SessionRecovery";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <SessionRecovery />
      {children}
    </SessionProvider>
  );
}