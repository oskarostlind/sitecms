import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  ChevronRight,
  CircleCheck,
  ExternalLink,
  FilePenLine,
  FileText,
  Image as ImageIcon,
  Info,
  ImageOff,
  Newspaper,
  PenLine,
  Plus,
  Search,
  BriefcaseBusiness,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { auditLogs, blocks, media, pages, posts, seoMeta, services, sites, users } from "@/lib/db/schema";
import { requireSiteAccessWithRole } from "@/lib/guard";
import { describeActivity } from "@/lib/audit-labels";
import { formatDateTime, relativeTime } from "@/lib/format";
import { displayDomain, siteUrl } from "@/lib/site-url";
import {
  Alert,
  Avatar,
  ButtonLink,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PageHeader,
} from "@/components/ui";

const RECENT_ACTIVITY = 5;

const countSql = sql<number>`count(*)::int`;

export default async function SiteOverviewPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { isOwner } = await requireSiteAccessWithRole(siteId);

  const [
    [site],
    [pagesCountRow],
    [firstPage],
    [postsCountRow],
    [servicesCountRow],
    [mediaCountRow],
    missingAltRows,
    [seoMissingRow],
    [lastBlockUpdateRow],
    recentActivity,
  ] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, siteId)).limit(1),
    db.select({ count: countSql }).from(pages).where(eq(pages.siteId, siteId)),
    db
      .select({ id: pages.id, title: pages.title })
      .from(pages)
      .where(eq(pages.siteId, siteId))
      .orderBy(asc(pages.sortOrder), asc(pages.createdAt))
      .limit(1),
    db
      .select({
        published: sql<number>`count(*) filter (where ${posts.published})::int`,
        drafts: sql<number>`count(*) filter (where not ${posts.published})::int`,
      })
      .from(posts)
      .where(eq(posts.siteId, siteId)),
    db.select({ count: countSql }).from(services).where(eq(services.siteId, siteId)),
    db.select({ count: countSql }).from(media).where(eq(media.siteId, siteId)),
    // Bildblock som har en bild men saknar alt-text, per sida.
    db
      .select({ pageId: blocks.pageId, count: countSql })
      .from(blocks)
      .where(
        and(
          eq(blocks.siteId, siteId),
          eq(blocks.type, "image"),
          sql`coalesce(${blocks.value}, '') <> ''`,
          sql`coalesce(trim(${blocks.alt}), '') = ''`,
        ),
      )
      .groupBy(blocks.pageId),
    db
      .select({ count: countSql })
      .from(seoMeta)
      .where(and(eq(seoMeta.siteId, siteId), sql`coalesce(trim(${seoMeta.description}), '') = ''`)),
    db
      .select({ max: sql<Date | string | null>`max(${blocks.updatedAt})` })
      .from(blocks)
      .where(eq(blocks.siteId, siteId)),
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        detail: auditLogs.detail,
        userEmail: auditLogs.userEmail,
        userName: users.name,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.siteId, siteId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(RECENT_ACTIVITY),
  ]);

  if (!site) notFound();

  const lastUpdated =
    lastBlockUpdateRow?.max && new Date(lastBlockUpdateRow.max) > new Date(site.updatedAt)
      ? lastBlockUpdateRow.max
      : site.updatedAt;

  const base = `/admin/sites/${siteId}`;
  const url = siteUrl(site.domain);

  const pagesCount = pagesCountRow?.count ?? 0;
  const publishedCount = postsCountRow?.published ?? 0;
  const draftCount = postsCountRow?.drafts ?? 0;
  const servicesCount = servicesCountRow?.count ?? 0;
  const mediaCount = mediaCountRow?.count ?? 0;
  const missingAltCount = missingAltRows.reduce((sum, row) => sum + row.count, 0);
  const seoMissingCount = seoMissingRow?.count ?? 0;

  // Når ändringarna sajten direkt? Ägaren får en mjuk påminnelse när ingen
  // revalidate-URL är satt (sajten kan ha tidsbaserad ISR och fungera ändå)
  // och en varning när senaste webhooken misslyckades. Redaktörer ser bara en
  // neutral rad, och bara när webhooken faktiskt misslyckats.
  const hasRevalidateUrl = Boolean(site.revalidateUrl?.trim());
  const webhookFailed = hasRevalidateUrl && site.lastWebhookStatus === "failed";
  const ownerDeliveryNotice: { tone: "info" | "warning"; text: string } | null = !isOwner
    ? null
    : !hasRevalidateUrl
      ? {
          tone: "info",
          text: "Ingen revalidate-URL är inställd — ändringar visas på sajten först när den hämtar nytt innehåll eller byggs om.",
        }
      : webhookFailed
        ? {
            tone: "warning",
            text: `Senaste uppdateringen nådde inte sajten: ${site.lastWebhookError?.trim() || "okänt fel."}`,
          }
        : null;
  const showEditorDelayNote = !isOwner && webhookFailed;

  const editStartHref = firstPage ? `${base}/pages/${firstPage.id}` : `${base}/pages`;

  const stats: { label: string; value: number; hint?: string; href: string; icon: LucideIcon }[] = [
    { label: "Sidor", value: pagesCount, href: `${base}/pages`, icon: FileText },
    {
      label: "Inlägg",
      value: publishedCount + draftCount,
      hint: `${publishedCount} publicerade · ${draftCount} utkast`,
      href: `${base}/posts`,
      icon: Newspaper,
    },
    { label: "Tjänster", value: servicesCount, href: `${base}/services`, icon: BriefcaseBusiness },
    { label: "Media", value: mediaCount, href: `${base}/media`, icon: ImageIcon },
  ];

  const todos: { key: string; icon: LucideIcon; text: string; href: string }[] = [];
  if (missingAltCount > 0) {
    todos.push({
      key: "alt",
      icon: ImageOff,
      text:
        missingAltCount === 1
          ? "1 bild saknar beskrivning (alt-text)"
          : `${missingAltCount} bilder saknar beskrivning (alt-text)`,
      // Ligger alla på samma sida – gå direkt dit.
      href: missingAltRows.length === 1 ? `${base}/pages/${missingAltRows[0].pageId}` : `${base}/pages`,
    });
  }
  if (seoMissingCount > 0) {
    todos.push({
      key: "seo",
      icon: Search,
      text:
        seoMissingCount === 1
          ? "1 sida saknar SEO-beskrivning"
          : `${seoMissingCount} sidor saknar SEO-beskrivning`,
      href: `${base}/seo`,
    });
  }
  if (draftCount > 0) {
    todos.push({
      key: "drafts",
      icon: FilePenLine,
      text: draftCount === 1 ? "1 inlägg är ett opublicerat utkast" : `${draftCount} inlägg är opublicerade utkast`,
      href: `${base}/posts`,
    });
  }

  const quickLinks: { label: string; description: string; href: string; icon: LucideIcon }[] = [
    { label: "Redigera sidor", description: "Ändra texter och bilder på hemsidan.", href: `${base}/pages`, icon: FileText },
    { label: "Skriv ett inlägg", description: "Berätta om ett nytt projekt eller en nyhet.", href: `${base}/posts/new`, icon: PenLine },
    { label: "Tjänster & priser", description: "Uppdatera vad du erbjuder och vad det kostar.", href: `${base}/services`, icon: BriefcaseBusiness },
    { label: "SEO-inställningar", description: "Hur sidorna visas i Google.", href: `${base}/seo`, icon: Search },
    { label: "Mediabibliotek", description: "Ladda upp och hantera bilder och filer.", href: `${base}/media`, icon: ImageIcon },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        className="mb-0"
        title={site.name}
        description={
          url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1 rounded-md text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
            >
              <span className="truncate">{displayDomain(site.domain)}</span>
              <ExternalLink aria-hidden className="size-3.5 shrink-0" />
              <span className="sr-only">(öppnas i ny flik)</span>
            </a>
          ) : (
            <span className="italic text-neutral-400">Ingen domän angiven</span>
          )
        }
        actions={
          <>
            <ButtonLink href={editStartHref} icon={<FileText />}>
              Redigera startsidan
            </ButtonLink>
            <ButtonLink href={`${base}/posts/new`} variant="secondary" icon={<Plus />}>
              Nytt inlägg
            </ButtonLink>
          </>
        }
      />

      {ownerDeliveryNotice ? (
        <Alert
          tone={ownerDeliveryNotice.tone}
          actions={
            <ButtonLink href={`${base}/integration#revalidate`} variant="secondary" size="sm">
              Gå till integration
            </ButtonLink>
          }
        >
          <span className="[overflow-wrap:anywhere]">{ownerDeliveryNotice.text}</span>
        </Alert>
      ) : showEditorDelayNote ? (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Info aria-hidden className="size-4 shrink-0 text-neutral-400" />
          Det kan dröja innan ändringar syns på sajten.
        </p>
      ) : null}

      {/* Statistik */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <li key={stat.label} className="min-w-0">
              <Link
                href={stat.href}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
              >
                <Card interactive className="h-full p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      aria-hidden
                      className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                    >
                      <Icon className="size-5" />
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 text-neutral-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-500"
                    />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-neutral-900 tabular-nums">{stat.value}</p>
                  <p className="text-sm text-neutral-500">{stat.label}</p>
                  {stat.hint ? <p className="mt-1 text-xs text-neutral-500">{stat.hint}</p> : null}
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Förslag / att göra */}
      <Card>
        <CardHeader>
          <CardTitle>Förslag</CardTitle>
          <CardDescription>Små saker som gör hemsidan bättre.</CardDescription>
        </CardHeader>
        <CardContent>
          {todos.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <CircleCheck aria-hidden className="size-4 shrink-0 text-emerald-600" />
              Allt ser bra ut – inget att åtgärda just nu.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {todos.map((todo) => {
                const Icon = todo.icon;
                return (
                  <li key={todo.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0">
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-neutral-800">{todo.text}</span>
                    <ButtonLink href={todo.href} variant="secondary" size="sm">
                      Åtgärda
                    </ButtonLink>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Senaste aktivitet */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Senaste aktivitet</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500">Ingen aktivitet ännu.</p>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((row) => {
                  const who = row.userName || row.userEmail;
                  return (
                    <li key={row.id} className="flex items-start gap-3">
                      <Avatar name={who} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-neutral-900 [overflow-wrap:anywhere]">{describeActivity(row)}</p>
                        <p className="mt-0.5 flex min-w-0 flex-wrap gap-x-1.5 text-xs text-neutral-500">
                          <span className="truncate">{who}</span>
                          <span aria-hidden>·</span>
                          <time dateTime={new Date(row.createdAt).toISOString()} title={formatDateTime(row.createdAt)}>
                            {relativeTime(row.createdAt)}
                          </time>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
          <CardFooter className="justify-start">
            <Link
              href={`${base}/aktivitet`}
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
            >
              Visa all aktivitet
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </CardFooter>
        </Card>

        {/* Snabbval */}
        <Card>
          <CardHeader>
            <CardTitle>Snabbval</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 sm:px-3 sm:pb-3">
            <ul>
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                    >
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors duration-150 group-hover:bg-brand-50 group-hover:text-brand-600"
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-neutral-900">{link.label}</span>
                        <span className="block truncate text-xs text-neutral-500">{link.description}</span>
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-neutral-300 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-500"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-neutral-500">Senast uppdaterad {formatDateTime(lastUpdated)}</p>
    </div>
  );
}
