import { redirect } from "next/navigation";
import { requireUser, getUserSites } from "@/lib/guard";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await requireUser();
  const sites = await getUserSites(user);

  if (sites.length === 1) {
    redirect(`/admin/sites/${sites[0].id}`);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
        Dina sajter
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Välj vilken sajt du vill hantera.
      </p>

      {error === "forbidden" && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Du har inte åtkomst till den sajten. Välj en av dina sajter nedan.
        </div>
      )}

      {sites.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-neutral-500">
            Inga sajter är kopplade till ditt konto ännu.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <a
              key={site.id}
              href={`/admin/sites/${site.id}`}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="font-medium text-neutral-900">{site.name}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                {site.domain ?? "Ingen domän angiven"}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
