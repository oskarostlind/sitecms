import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, sites } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";

const MAX_ROWS = 100;

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/**
 * Global aktivitetslogg över samtliga sajter. Endast för admin-rollen —
 * kunder ser bara sin egen sajts logg via /admin/sites/[siteId]/aktivitet.
 */
export default async function GlobalActivityPage() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/admin?error=forbidden");
  }

  const rows = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      userEmail: auditLogs.userEmail,
      action: auditLogs.action,
      detail: auditLogs.detail,
      siteId: auditLogs.siteId,
      siteName: sites.name,
    })
    .from(auditLogs)
    .leftJoin(sites, eq(auditLogs.siteId, sites.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(MAX_ROWS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Aktivitet – alla sajter</h1>
        <p className="mt-1 text-sm text-neutral-500">
          De {MAX_ROWS} senaste händelserna över samtliga sajter.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Ingen aktivitet registrerad ännu.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tid</th>
                <th className="px-5 py-3 font-medium">Användare</th>
                <th className="px-5 py-3 font-medium">Sajt</th>
                <th className="px-5 py-3 font-medium">Händelse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-700">
                    {row.userEmail}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-500">
                    {row.siteName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-neutral-900">
                    {row.detail || row.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
