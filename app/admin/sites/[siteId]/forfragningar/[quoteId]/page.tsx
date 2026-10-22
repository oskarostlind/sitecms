import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, quoteRequests, quoteStatusValues } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { deleteQuote, setQuoteStatus } from "@/lib/actions/quotes";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import { FileText, Image as ImageIcon } from "lucide-react";
import {
  QUOTE_CUSTOMER_TYPE_LABEL,
  QUOTE_STATUS_CLASS,
  QUOTE_STATUS_LABEL,
  formatDateTime,
  formatFileSize,
  formatRot,
} from "@/components/admin/quote-status";

const EMAIL_STATUS_TEXT = {
  sent: "Mejl skickat till företaget och kvittens till kunden.",
  failed: "Mejlen kunde inte skickas — förfrågan är sparad här ändå.",
  skipped: "Inga mejl skickades.",
} as const;

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string; quoteId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { siteId, quoteId } = await params;
  await requireSiteAccess(siteId);
  const { saved } = await searchParams;

  const [q] = await db
    .select()
    .from(quoteRequests)
    .where(and(eq(quoteRequests.id, quoteId), eq(quoteRequests.siteId, siteId)))
    .limit(1);
  if (!q) notFound();

  const fields: [string, React.ReactNode][] = [
    ["Namn", q.name],
    ["Företag", q.company],
    ["Kundtyp", q.customerType ? QUOTE_CUSTOMER_TYPE_LABEL[q.customerType] : null],
    ["Telefon", <a key="t" className="underline" href={`tel:${q.phone}`}>{q.phone}</a>],
    ["E-post", <a key="e" className="underline" href={`mailto:${q.email}`}>{q.email}</a>],
    ["Typ av uppdrag", q.jobType],
    ["Maskin", q.machine],
    ["Plats/ort", q.location],
    ["Postnummer", q.postalCode],
    ["Önskad start", q.desiredStart],
    ["Budget", q.budget],
    ["ROT-avdrag", formatRot(q.rot)],
    ["Leadkälla", q.source ? <span key="s" className="break-all font-mono text-xs">{q.source}</span> : null],
    ["Inkommen", formatDateTime(q.createdAt)],
  ];
  const attachments = q.attachments ?? [];
  const extra = Object.entries(q.extra ?? {});

  return (
    <div className="max-w-3xl space-y-6">
      <Link href={`/admin/sites/${siteId}/forfragningar`} className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Alla förfrågningar
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Förfrågan från {q.name}</h1>
        <span data-testid="quote-status" className={`rounded-full px-2 py-0.5 text-xs font-medium ${QUOTE_STATUS_CLASS[q.status]}`}>
          {QUOTE_STATUS_LABEL[q.status]}
        </span>
      </div>

      {saved === "1" ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Status sparad.</p>
      ) : null}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[160px_1fr]">
          {fields
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-sm text-neutral-500">{label}</dt>
                <dd className="break-words text-sm text-neutral-900">{value}</dd>
              </div>
            ))}
        </dl>
        <h2 className="mt-6 text-sm font-medium text-neutral-900">Beskrivning</h2>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-800">{q.description}</p>

        {attachments.length > 0 ? (
          <section className="mt-6" aria-labelledby="bilagor-rubrik" data-testid="quote-attachments">
            <h2 id="bilagor-rubrik" className="text-sm font-medium text-neutral-900">
              Bilagor <span className="font-normal text-neutral-500">({attachments.length})</span>
            </h2>
            <ul className="mt-2 flex flex-wrap gap-3">
              {attachments.map((a) => {
                const isImage = a.contentType.startsWith("image/") && !a.contentType.startsWith("image/hei");
                return (
                  <li key={a.url} className="w-36">
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 transition-colors duration-150 hover:border-neutral-400"
                      title={`Öppna ${a.name} i ny flik`}
                    >
                      {isImage ? (
                        // Externa bilagor kan ligga var som helst (https), så en vanlig img.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.url}
                          alt={a.name}
                          loading="lazy"
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <span className="flex aspect-square w-full items-center justify-center text-neutral-400 group-hover:text-neutral-600">
                          {a.contentType === "application/pdf" ? (
                            <FileText className="size-8" aria-hidden />
                          ) : (
                            <ImageIcon className="size-8" aria-hidden />
                          )}
                        </span>
                      )}
                      <span className="block border-t border-neutral-200 bg-white px-2 py-1.5">
                        <span className="block truncate text-xs font-medium text-neutral-800">{a.name}</span>
                        <span className="block text-[11px] text-neutral-500">
                          {a.contentType === "application/pdf" ? "PDF" : a.contentType.replace("image/", "").toUpperCase()}
                          {formatFileSize(a.size) ? ` · ${formatFileSize(a.size)}` : ""}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {extra.length > 0 ? (
          <section className="mt-6" aria-labelledby="ovrigt-rubrik" data-testid="quote-extra">
            <h2 id="ovrigt-rubrik" className="text-sm font-medium text-neutral-900">Övriga uppgifter</h2>
            <div className="mt-2 overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-neutral-100">
                  {extra.map(([key, value]) => (
                    <tr key={key} className="align-top">
                      <th scope="row" className="w-1/3 bg-neutral-50 px-3 py-2 font-mono text-xs font-medium text-neutral-600">
                        {key}
                      </th>
                      <td className="whitespace-pre-wrap break-words px-3 py-2 text-neutral-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <p className="mt-6 text-xs text-neutral-500">
          {EMAIL_STATUS_TEXT[q.emailStatus]}
          {q.emailError ? ` (${q.emailError})` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <form action={setQuoteStatus.bind(null, siteId, q.id)} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-neutral-700">Status</label>
            <select
              id="status"
              name="status"
              defaultValue={q.status}
              className="mt-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {quoteStatusValues.map((s) => (
                <option key={s} value={s}>{QUOTE_STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
            Spara status
          </button>
          <a
            href={`mailto:${q.email}?subject=${encodeURIComponent(`Sv: Offertförfrågan – ${q.jobType}`)}`}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Svara via e-post
          </a>
        </form>
        <form action={deleteQuote.bind(null, siteId, q.id)} className="ml-auto">
          <ConfirmButton
            confirmText="Radera förfrågan permanent? Det går inte att ångra."
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Radera
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
