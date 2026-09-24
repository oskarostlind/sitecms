import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { History } from "lucide-react";
import { db } from "@/lib/db";
import { auditLogs, sites } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { isUndoData } from "@/lib/undo-data";
import { describeActivity } from "@/lib/audit-labels";
import { formatDateTime, relativeTime } from "@/lib/format";
import { Avatar, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import UndoActivityButton from "@/components/admin/UndoActivityButton";

const MAX_ROWS = 100;
const TIME_ZONE = "Europe/Stockholm";

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

const dayLabelFormatter = new Intl.DateTimeFormat("sv-SE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

function dayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

/** "I dag", "I går" eller ett fullt datum – räknat i svensk tid. */
function dayLabel(date: Date, now: Date): string {
  const key = dayKey(date);
  if (key === dayKey(now)) return "I dag";
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "I går";
  return dayLabelFormatter.format(date);
}

function groupByDay<T extends { createdAt: Date }>(rows: T[], now: Date): { label: string; rows: T[] }[] {
  const groups: { label: string; rows: T[] }[] = [];
  for (const row of rows) {
    const label = dayLabel(row.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.rows.push(row);
    } else {
      groups.push({ label, rows: [row] });
    }
  }
  return groups;
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
      undoData: auditLogs.undoData,
      undoneAt: auditLogs.undoneAt,
      siteId: auditLogs.siteId,
      siteName: sites.name,
    })
    .from(auditLogs)
    .leftJoin(sites, eq(auditLogs.siteId, sites.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(MAX_ROWS);

  const now = new Date();
  const groups = groupByDay(rows, now);

  return (
    <div>
      <PageHeader title="All aktivitet" description={`De ${MAX_ROWS} senaste händelserna över samtliga sajter.`} />

      {rows.length === 0 ? (
        <EmptyState icon={<History />} title="Ingen aktivitet ännu" description="Händelser från alla sajter dyker upp här." />
      ) : (
        <Card className="overflow-hidden">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="border-b border-neutral-200 bg-neutral-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {group.label}
              </div>
              <ul className="divide-y divide-neutral-100">
                {group.rows.map((row) => (
                  <li key={row.id} className="flex items-start gap-3 px-5 py-4">
                    <Avatar name={row.userEmail} size={32} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-900">{describeActivity(row)}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-500">
                        <span className="truncate">{row.userEmail}</span>
                        <span aria-hidden>·</span>
                        <span title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt, now)}</span>
                        {row.siteName ? <Badge tone="neutral">{row.siteName}</Badge> : null}
                      </div>
                    </div>
                    <div className="shrink-0 pl-2">
                      {row.undoneAt ? (
                        <Badge tone="neutral">Ångrad</Badge>
                      ) : isUndoData(row.undoData) ? (
                        <UndoActivityButton logId={row.id} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
