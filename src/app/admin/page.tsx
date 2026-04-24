import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.isAdmin) redirect("/");
  return <AdminDashboard session={session} />;
}
