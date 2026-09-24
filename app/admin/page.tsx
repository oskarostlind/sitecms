import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Globe, Plus } from "lucide-react";
import { requireUser, getUserSites } from "@/lib/guard";
import { Alert, Avatar, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";
import { displayDomain } from "@/lib/site-url";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const sites = await getUserSites(user);
  const isAdmin = user.role === "admin";

  if (sites.length === 1) {
    redirect(`/admin/sites/${sites[0].id}`);
  }

  const sorted = [...sites].sort((a, b) => a.name.localeCompare(b.name, "sv"));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dina sajter"
        description={
          isAdmin
            ? "Alla sajter i systemet. Välj en sajt för att ändra dess innehåll."
            : "Välj vilken sajt du vill hantera."
        }
        actions={
          isAdmin ? (
            <ButtonLink href="/admin/sites/new" icon={<Plus />}>
              Ny sajt
            </ButtonLink>
          ) : null
        }
        className="mb-0"
      />

      {error === "forbidden" ? (
        <Alert tone="warning" title="Du har inte åtkomst till den sajten">
          Välj en av dina sajter nedan i stället.
        </Alert>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Inga sajter kopplade till ditt konto ännu."
          description={
            isAdmin
              ? "Skapa en sajt för att komma igång."
              : "Hör av dig till oss så kopplar vi din sajt till ditt konto."
          }
          action={
            isAdmin ? (
              <ButtonLink href="/admin/sites/new" icon={<Plus />}>
                Skapa din första sajt
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((site) => {
            const domain = displayDomain(site.domain);
            return (
              <li key={site.id} className="min-w-0">
                <Link
                  href={`/admin/sites/${site.id}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                >
                  <Card interactive className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-3">
                      <Avatar name={site.name} size={44} className="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-neutral-900">{site.name}</h2>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500">
                          <Globe aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
                          {domain ? (
                            <span className="truncate">{domain}</span>
                          ) : (
                            <span className="truncate italic text-neutral-400">Ingen domän angiven</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                      <span title={formatDateTime(site.updatedAt)}>Uppdaterad {relativeTime(site.updatedAt)}</span>
                      <ArrowRight
                        aria-hidden
                        className="size-4 shrink-0 text-neutral-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brand-600"
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
