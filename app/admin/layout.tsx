import { requireUser, getUserSites, getOwnedSiteIds } from "@/lib/guard";
import { logoutAction } from "@/lib/auth-actions";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const [sites, ownedSiteIds] = await Promise.all([getUserSites(user), getOwnedSiteIds(user)]);

  return (
    <AdminShell user={user} sites={sites} ownedSiteIds={ownedSiteIds} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
