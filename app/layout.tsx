// import "./globals.css";
// import { ThemeProvider } from "@/components/theme-provider"
// import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
// export const dynamic = "force-dynamic";
// export const revalidate = 0;


// export default function RootLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <body>
//         <ThemeProvider
//           attribute="class"
//           defaultTheme="system"
//           enableSystem
//           disableTransitionOnChange
//         >
//           <ReactQueryProvider>
//             {children}
//           </ReactQueryProvider>
//         </ThemeProvider>
//       </body>
//     </html>
//   );
// }

import "@/app/globals.css";
import { Providers } from "@/app/providers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}