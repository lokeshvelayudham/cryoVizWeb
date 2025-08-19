import "@/app/globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/app/providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  
  // Debug server session in layout
  if (process.env.NODE_ENV === "development") {
    console.log("🏗️ RootLayout - Server session:", session ? 
      { user: session.user?.email, exists: true } : 
      { exists: false }
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
