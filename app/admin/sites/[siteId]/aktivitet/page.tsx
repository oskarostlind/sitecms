import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/guard";
import { isUndoData } from "@/lib/undo-data";
import UndoActivityButton from "@/components/admin/UndoActivityButton";

const MAX_ROWS = 100;

function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function SiteActivityPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.siteId, siteId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(MAX_ROWS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Aktivitet</h1>
        <p className="mt-1 text-sm text-neutral-500">
          De {MAX_ROWS} senaste händelserna för den här sajten. Ändringar som
          går att ta tillbaka har en Ångra-knapp.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Ingen aktivitet registrerad ännu.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">Tid</th>
                <th className="px-5 py-3 font-medium">Användare</th>
                <th className="px-5 py-3 font-medium">Händelse</th>
                <th className="px-5 py-3 font-medium">Åtgärd</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-neutral-50">
                  <td className="whitespace-nowrap px-5 py-3 text-neutral-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="max-w-[200px] truncate px-5 py-3 text-neutral-700" title={row.userEmail}>
                    {row.userEmail}
                  </td>
                  <td className="px-5 py-3 text-neutral-900">
                    {row.detail || row.action}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    {row.undoneAt ? (
                      <span className="text-neutral-400">Ångrad</span>
                    ) : isUndoData(row.undoData) ? (
                      <UndoActivityButton logId={row.id} />
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
