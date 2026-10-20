import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, quoteRequests, quoteStatusValues, type QuoteStatus } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL, formatDateTime } from "@/components/admin/quote-status";

const FILTERS: { value: QuoteStatus | "alla"; label: string }[] = [
  { value: "ny", label: "Nya" },
  { value: "besvarad", label: "Besvarade" },
  { value: "arkiverad", label: "Arkiverade" },
  { value: "alla", label: "Alla" },
];

export default async function QuotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams: Promise<{ status?: string; deleted?: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);
  const { status: statusParam, deleted } = await searchParams;

  const filter: QuoteStatus | "alla" =
    statusParam === "alla" || quoteStatusValues.includes(statusParam as QuoteStatus)
      ? (statusParam as QuoteStatus | "alla")
      : "ny";

  const where =
    filter === "alla"
      ? eq(quoteRequests.siteId, siteId)
      : and(eq(quoteRequests.siteId, siteId), eq(quoteRequests.status, filter));

  const [rows, counts] = await Promise.all([
    db.select().from(quoteRequests).where(where).orderBy(desc(quoteRequests.createdAt)).limit(200),
    db
      .select({ status: quoteRequests.status, count: sql<number>`count(*)::int` })
      .from(quoteRequests)
      .where(eq(quoteRequests.siteId, siteId))
      .groupBy(quoteRequests.status),
  ]);

  const countFor = (value: QuoteStatus | "alla") =>
    value === "alla"
      ? counts.reduce((sum, c) => sum + c.count, 0)
      : (counts.find((c) => c.status === value)?.count ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Förfrågningar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Offertförfrågningar från sajtens formulär. Markera dem som besvarade när du har svarat kunden.
        </p>
      </div>

      {deleted === "1" ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Förfrågan raderades.</p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Filtrera på status">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/sites/${siteId}/forfragningar?status=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              filter === f.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {f.label} <span className="opacity-70">({countFor(f.value)})</span>
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Inga förfrågningar här.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white" data-testid="quote-list">
          {rows.map((q) => (
            <li key={q.id}>
              <Link
                href={`/admin/sites/${siteId}/forfragningar/${q.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-neutral-50 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${QUOTE_STATUS_CLASS[q.status]}`}>
                  {QUOTE_STATUS_LABEL[q.status]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    {q.name}
                    {q.company ? <span className="font-normal text-neutral-500"> · {q.company}</span> : null}
                  </span>
                  <span className="block truncate text-sm text-neutral-500">
                    {q.jobType} — {q.description}
                  </span>
                </span>
                <span className="whitespace-nowrap text-xs text-neutral-500">{formatDateTime(q.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
