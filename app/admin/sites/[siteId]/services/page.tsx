import { asc, eq } from "drizzle-orm";
import { db, services } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { createService, updateService, deleteService, moveService } from "@/lib/actions/services";
import { ConfirmButton } from "@/components/content/ConfirmButton";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await requireSiteAccess(siteId);

  const rows = await db
    .select()
    .from(services)
    .where(eq(services.siteId, siteId))
    .orderBy(asc(services.sortOrder));

  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Tjänster &amp; priser</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ordningen nedan styr hur tjänsterna visas på sajten. Dolda tjänster syns inte publikt.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Inga tjänster ännu. Lägg till din första nedan.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((service, index) => (
            <div key={service.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <form action={updateService.bind(null, siteId, service.id)} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Titel</label>
                  <input name="title" type="text" defaultValue={service.title} className={inputClassName} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700">Beskrivning</label>
                  <input
                    name="description"
                    type="text"
                    defaultValue={service.description ?? ""}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Pris</label>
                  <input
                    name="price"
                    type="text"
                    defaultValue={service.price ?? ""}
                    placeholder="T.ex. Från 15 000 kr"
                    className={inputClassName}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={service.visible}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    Synlig på sajten
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Spara
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                <form action={moveService.bind(null, siteId, service.id, "up")}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Flytta upp
                  </button>
                </form>
                <form action={moveService.bind(null, siteId, service.id, "down")}>
                  <button
                    type="submit"
                    disabled={index === rows.length - 1}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Flytta ner
                  </button>
                </form>
                <form action={deleteService.bind(null, siteId, service.id)} className="ml-auto">
                  <ConfirmButton
                    confirmText="Ta bort tjänsten? Detta går inte att ångra."
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Ta bort
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={createService.bind(null, siteId)}>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Lägg till tjänst
        </button>
      </form>
    </div>
  );
}
