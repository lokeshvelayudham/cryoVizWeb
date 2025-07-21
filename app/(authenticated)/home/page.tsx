import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import ClientHome from "@/app/(authenticated)/home/ClientHome";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/login");

  return <ClientHome />;
}