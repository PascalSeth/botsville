import { redirect } from "next/navigation";
import { auth } from "@/lib/auth-config";
import { DashboardShell } from "./components/DashboardShell";

export const metadata = {
  title: "Admin Dashboard | Botsville",
  description: "Manage Botsville MLBB platform — tournaments, teams, content, and more.",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const role = (session.user as { role?: string | null }).role;
  if (!role) {
    redirect("/?error=admin_required");
  }

  return (
    <div className="min-h-screen bg-[#07070d] text-white">
      <DashboardShell user={session.user}>{children}</DashboardShell>
    </div>
  );
}
