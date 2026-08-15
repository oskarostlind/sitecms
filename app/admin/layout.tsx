import { requireUser, getUserSites } from "@/lib/guard";
import { logoutAction } from "@/lib/auth-actions";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const sites = await getUserSites(user);

  return (
    <AdminShell user={user} sites={sites} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
