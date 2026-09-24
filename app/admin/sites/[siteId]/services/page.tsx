import { asc, eq } from "drizzle-orm";
import { ArrowDown, ArrowUp, Plus, Tags, Trash2 } from "lucide-react";
import { db, services } from "@/lib/db";
import { requireSiteAccess } from "@/lib/guard";
import { createService, updateService, deleteService, moveService } from "@/lib/actions/services";
import { ConfirmButton } from "@/components/content/ConfirmButton";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Input,
  PageHeader,
  SubmitButton,
  buttonClassName,
} from "@/components/ui";

const labelClass = "mb-1 flex items-center gap-2 text-xs font-medium text-neutral-600";

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

  const addServiceForm = (
    <form action={createService.bind(null, siteId)}>
      <SubmitButton icon={<Plus />} pendingText="Lägger till…">
        Lägg till tjänst
      </SubmitButton>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Tjänster & priser"
        description="Ordningen nedan styr hur tjänsterna visas på sajten. Dolda tjänster syns inte publikt."
        actions={rows.length > 0 ? addServiceForm : undefined}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Tags />}
          title="Inga tjänster ännu"
          description="Lägg till det du erbjuder, gärna med ett ungefärligt pris, så att kunderna ser det på sajten."
          action={addServiceForm}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-neutral-200">
            {rows.map((service, index) => {
              const fieldId = (field: string) => `service-${service.id}-${field}`;
              return (
                <li
                  key={service.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:px-5 xl:flex-row xl:items-end xl:gap-4"
                >
                  <span
                    aria-hidden
                    className="hidden w-5 shrink-0 pb-2.5 text-right text-sm tabular-nums text-neutral-400 xl:block"
                  >
                    {index + 1}
                  </span>

                  {/* Spar-formuläret: ett eget <form> per tjänst med title/description/price/visible + Spara. */}
                  <form
                    action={updateService.bind(null, siteId, service.id)}
                    aria-label={`Tjänst ${index + 1}: ${service.title}`}
                    className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 sm:items-end xl:grid-cols-[1fr_1fr_160px_auto]"
                  >
                    <div className="min-w-0">
                      <label htmlFor={fieldId("title")} className={labelClass}>
                        Titel
                        {!service.visible ? <Badge tone="warning">Dold</Badge> : null}
                      </label>
                      <Input id={fieldId("title")} name="title" type="text" defaultValue={service.title} />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={fieldId("description")} className={labelClass}>
                        Beskrivning
                      </label>
                      <Input
                        id={fieldId("description")}
                        name="description"
                        type="text"
                        defaultValue={service.description ?? ""}
                        placeholder="Kort om tjänsten"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor={fieldId("price")} className={labelClass}>
                        Pris
                      </label>
                      <Input
                        id={fieldId("price")}
                        name="price"
                        type="text"
                        defaultValue={service.price ?? ""}
                        placeholder="T.ex. Från 15 000 kr"
                      />
                    </div>
                    <div className="flex h-10 items-center gap-3">
                      <Checkbox
                        id={fieldId("visible")}
                        name="visible"
                        defaultChecked={service.visible}
                        label="Synlig"
                      />
                      <SubmitButton size="sm" pendingText="Sparar…">
                        Spara
                      </SubmitButton>
                    </div>
                  </form>

                  {/* Flytta/ta bort är egna formulär bredvid spar-formuläret. */}
                  <div className="flex items-center gap-1 xl:pb-1">
                    <span aria-hidden className="mr-auto text-xs tabular-nums text-neutral-400 xl:hidden">
                      #{index + 1}
                    </span>
                    <form action={moveService.bind(null, siteId, service.id, "up")}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={index === 0}
                        aria-label="Flytta upp"
                        title="Flytta upp"
                        icon={<ArrowUp />}
                      />
                    </form>
                    <form action={moveService.bind(null, siteId, service.id, "down")}>
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        disabled={index === rows.length - 1}
                        aria-label="Flytta ner"
                        title="Flytta ner"
                        icon={<ArrowDown />}
                      />
                    </form>
                    <form action={deleteService.bind(null, siteId, service.id)} className="ml-1">
                      <ConfirmButton
                        confirmText="Ta bort tjänsten? Detta går inte att ångra."
                        className={buttonClassName({ variant: "danger", size: "sm" })}
                      >
                        <Trash2 aria-hidden className="size-4" />
                        Ta bort
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
