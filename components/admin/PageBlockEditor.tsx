"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, CircleCheck, ExternalLink, FileText, Undo2 } from "lucide-react";
import { updateBlocks, type BlockUpdate } from "@/lib/actions/pages";
import { undoActivity } from "@/lib/actions/undo";
import { fieldHint, fieldLabel, groupDescription } from "@/components/admin/labels";
import AutoTextarea from "@/components/admin/AutoTextarea";
import ImageField from "@/components/admin/ImageField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { BlockDTO, BlockGroupDTO } from "@/components/admin/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Kbd,
  fieldIds,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { siteUrl } from "@/lib/site-url";

type GroupStatus = "idle" | "saving" | "saved" | "error";

/** Ögonblicksbild av vad som stod i fälten innan senaste sparning. */
type SavedSnapshot = {
  undoId: string | null;
  blocks: { blockId: string; value: string; alt: string }[];
  groupKeys: string[];
};

const TEXT_TO_TEXTAREA_THRESHOLD = 60;
/** Hur länge "Sparat ✓" visas i sektionen efter en sparning. */
const SAVED_BADGE_MS = 4000;
/** Avstånd från fönstrets överkant (topbar + luft) där en sektion räknas som aktiv. */
const ACTIVE_SECTION_OFFSET = 140;

const LEAVE_CONFIRM = "Du har ändringar som inte är sparade. Vill du lämna sidan ändå?";

function groupAnchor(key: string) {
  return `grupp-${key}`;
}

function unsavedLabel(count: number) {
  return count === 1 ? "1 osparad ändring" : `${count} osparade ändringar`;
}

export default function PageBlockEditor({
  siteId,
  groups,
  siteDomain = null,
  pageSlug,
}: {
  siteId: string;
  groups: BlockGroupDTO[];
  /** Sajtens domän (om den finns) – används för länken "Visa sidan" efter sparning. */
  siteDomain?: string | null;
  pageSlug?: string;
}) {
  const { toast } = useToast();

  const initial = useMemo(() => {
    const values: Record<string, string> = {};
    const alts: Record<string, string> = {};
    for (const group of groups) {
      for (const block of group.blocks) {
        values[block.id] = block.value;
        alts[block.id] = block.alt;
      }
    }
    return { values, alts };
  }, [groups]);

  const [values, setValues] = useState<Record<string, string>>(initial.values);
  const [alts, setAlts] = useState<Record<string, string>>(initial.alts);
  const originalValues = useRef<Record<string, string>>({ ...initial.values });
  const originalAlts = useRef<Record<string, string>>({ ...initial.alts });

  const [groupStatus, setGroupStatus] = useState<Record<string, GroupStatus>>({});
  const [groupError, setGroupError] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  // Senaste sparningen — grunden för "Ångra" i sparraden längst ner och i toasten.
  const [lastSave, setLastSave] = useState<SavedSnapshot | null>(null);
  const lastSaveRef = useRef<SavedSnapshot | null>(null);
  const [undoing, setUndoing] = useState(false);
  const undoingRef = useRef(false);
  const savingAllRef = useRef(false);
  const [undoNotice, setUndoNotice] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [activeGroup, setActiveGroup] = useState<string | null>(groups[0]?.key ?? null);
  const [isMac, setIsMac] = useState(false);

  const baseUrl = siteUrl(siteDomain);
  const pageUrl = baseUrl && pageSlug !== undefined ? `${baseUrl}/${pageSlug === "home" ? "" : pageSlug}` : null;

  function rememberLastSave(snapshot: SavedSnapshot | null) {
    lastSaveRef.current = snapshot;
    setLastSave(snapshot);
  }

  function setStatus(groupKey: string, status: GroupStatus, message?: string) {
    setGroupStatus((prev) => ({ ...prev, [groupKey]: status }));
    setGroupError((prev) => ({ ...prev, [groupKey]: message ?? "" }));
    if (timers.current[groupKey]) clearTimeout(timers.current[groupKey]);
    if (status === "saved") {
      timers.current[groupKey] = setTimeout(() => {
        setGroupStatus((prev) => ({ ...prev, [groupKey]: "idle" }));
      }, SAVED_BADGE_MS);
    }
  }

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of Object.values(pending)) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent));
  }, []);

  function handleChange(blockId: string, value: string) {
    setValues((prev) => ({ ...prev, [blockId]: value }));
  }

  function handleImageChange(blockId: string, next: { value: string; alt: string }) {
    setValues((prev) => ({ ...prev, [blockId]: next.value }));
    setAlts((prev) => ({ ...prev, [blockId]: next.alt }));
  }

  function isBlockDirty(block: BlockDTO) {
    return (
      values[block.id] !== originalValues.current[block.id] || alts[block.id] !== originalAlts.current[block.id]
    );
  }

  function changedInGroup(group: BlockGroupDTO): BlockUpdate[] {
    return group.blocks.filter(isBlockDirty).map((block) => ({
      blockId: block.id,
      value: values[block.id] ?? "",
      // Alt-texten hör bara till bildblock; övriga block lämnar kolumnen orörd.
      ...(block.type === "image" ? { alt: alts[block.id] ?? "" } : {}),
    }));
  }

  const dirtyCount = groups.reduce((sum, group) => sum + changedInGroup(group).length, 0);
  const anyDirty = dirtyCount > 0;

  /** Sparar vad fälten innehöll innan, så att en ångring kan skriva tillbaka det. */
  function snapshotOf(updates: BlockUpdate[]) {
    return updates.map((update) => ({
      blockId: update.blockId,
      value: originalValues.current[update.blockId] ?? "",
      alt: originalAlts.current[update.blockId] ?? "",
    }));
  }

  function commit(updates: BlockUpdate[]) {
    for (const update of updates) {
      originalValues.current[update.blockId] = update.value;
      if (update.alt !== undefined) {
        originalAlts.current[update.blockId] = update.alt ?? "";
      }
    }
  }

  function announceSaved(snapshot: SavedSnapshot) {
    toast({
      title: "Sparat",
      description: "Ändringen syns på sajten inom några sekunder.",
      ...(snapshot.undoId ? { action: { label: "Ångra", onClick: () => void undoSave(snapshot) } } : {}),
    });
  }

  function announceError(error: string) {
    toast({ tone: "danger", title: "Kunde inte spara", description: error });
  }

  async function saveGroup(group: BlockGroupDTO) {
    const changed = changedInGroup(group);
    if (changed.length === 0) return;

    const before = snapshotOf(changed);
    setStatus(group.key, "saving");
    setUndoNotice(null);

    const result = await updateBlocks(siteId, changed);

    if (!result.ok) {
      setStatus(group.key, "error", result.error);
      announceError(result.error);
      return;
    }

    commit(changed);
    setStatus(group.key, "saved");
    const snapshot: SavedSnapshot = { undoId: result.undoId, blocks: before, groupKeys: [group.key] };
    rememberLastSave(snapshot);
    announceSaved(snapshot);
  }

  async function saveAll(options: { fromShortcut?: boolean } = {}) {
    if (savingAllRef.current) return;
    const allChanged = groups.flatMap((group) => changedInGroup(group));
    if (allChanged.length === 0) {
      if (options.fromShortcut) toast({ tone: "neutral", title: "Inga ändringar att spara." });
      return;
    }

    const before = snapshotOf(allChanged);
    const dirtyGroups = groups.filter((group) => changedInGroup(group).length > 0).map((group) => group.key);

    savingAllRef.current = true;
    setSavingAll(true);
    setUndoNotice(null);
    const result = await updateBlocks(siteId, allChanged);
    savingAllRef.current = false;
    setSavingAll(false);

    if (!result.ok) {
      // Visa felet på samtliga grupper som hade ändringar.
      for (const key of dirtyGroups) {
        setStatus(key, "error", result.error);
      }
      announceError(result.error);
      return;
    }

    commit(allChanged);
    for (const key of dirtyGroups) {
      setStatus(key, "saved");
    }
    const snapshot: SavedSnapshot = { undoId: result.undoId, blocks: before, groupKeys: dirtyGroups };
    rememberLastSave(snapshot);
    announceSaved(snapshot);
  }

  /**
   * Ångrar en sparning. Bara den senaste går att ångra härifrån – en äldre
   * toast får inte skriva över något som sparats efteråt.
   */
  async function undoSave(snapshot: SavedSnapshot) {
    if (!snapshot.undoId || undoingRef.current) return;

    if (lastSaveRef.current?.undoId !== snapshot.undoId) {
      toast({
        tone: "warning",
        title: "Kan inte ångras här",
        description: "Du har sparat igen efter den ändringen. Äldre ändringar ångrar du under Aktivitet.",
      });
      return;
    }

    undoingRef.current = true;
    setUndoing(true);
    const result = await undoActivity(snapshot.undoId);
    undoingRef.current = false;
    setUndoing(false);

    if (!result.ok) {
      for (const key of snapshot.groupKeys) {
        setStatus(key, "error", result.error);
      }
      toast({ tone: "danger", title: "Kunde inte ångra", description: result.error });
      return;
    }

    // Skriv tillbaka de gamla värdena i fälten så att det kunden ser stämmer
    // med det som nu ligger i databasen.
    setValues((prev) => {
      const next = { ...prev };
      for (const block of snapshot.blocks) next[block.blockId] = block.value;
      return next;
    });
    setAlts((prev) => {
      const next = { ...prev };
      for (const block of snapshot.blocks) next[block.blockId] = block.alt;
      return next;
    });
    for (const block of snapshot.blocks) {
      originalValues.current[block.blockId] = block.value;
      originalAlts.current[block.blockId] = block.alt;
    }
    for (const key of snapshot.groupKeys) {
      setStatus(key, "idle");
    }

    rememberLastSave(null);
    setUndoNotice("Ändringen är ångrad.");
    toast({ tone: "neutral", title: "Ändringen är ångrad." });
  }

  // Ctrl/Cmd+S sparar hela sidan. Ref så att lyssnaren alltid ser senaste state.
  const saveAllRef = useRef(saveAll);
  useLayoutEffect(() => {
    saveAllRef.current = saveAll;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveAllRef.current({ fromShortcut: true });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Varna innan osparade ändringar försvinner: stängning/omladdning av fliken
  // (beforeunload) och klick på länkar inom panelen (klientnavigering).
  useEffect(() => {
    if (!anyDirty) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      // Äldre webbläsare kräver returnValue för att visa dialogen.
      event.returnValue = "";
    }

    function onClickCapture(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      // Externa länkar i samma flik fångas av beforeunload.
      if (url.origin !== window.location.origin) return;
      // Ankarlänkar på samma sida (sektionsnavigeringen) är ofarliga.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_CONFIRM)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClickCapture, true);
    };
  }, [anyDirty]);

  // Markera sektionen som syns i sektionsnavigeringen.
  useEffect(() => {
    if (groups.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = groups[0].key;
      for (const group of groups) {
        const el = document.getElementById(groupAnchor(group.key));
        if (el && el.getBoundingClientRect().top <= ACTIVE_SECTION_OFFSET) current = group.key;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && window.scrollY > 0;
      if (atBottom) current = groups[groups.length - 1].key;
      setActiveGroup(current);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [groups]);

  function scrollToGroup(event: React.MouseEvent<HTMLAnchorElement>, key: string) {
    const el = document.getElementById(groupAnchor(key));
    if (!el) return;
    event.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
    window.history.replaceState(window.history.state, "", `#${groupAnchor(key)}`);
    setActiveGroup(key);
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<FileText />}
        title="Den här sidan har inget innehåll ännu"
        description="Fälten läggs upp av din leverantör. Hör av dig om det är något du vill kunna ändra här."
      />
    );
  }

  return (
    <div className="lg:flex lg:gap-10">
      {/* Innehållskolumn */}
      <div className="min-w-0 flex-1 lg:max-w-3xl">
        <div className="space-y-6">
          {groups.map((group) => {
            const status = groupStatus[group.key] ?? "idle";
            const dirty = changedInGroup(group).length > 0;
            const description = groupDescription(group.key);
            const titleId = `${groupAnchor(group.key)}-titel`;

            return (
              <section
                key={group.key}
                id={groupAnchor(group.key)}
                aria-labelledby={titleId}
                tabIndex={-1}
                className="scroll-mt-20 rounded-xl focus:outline-none"
              >
                <Card>
                  <CardHeader
                    actions={
                      <>
                        <span aria-live="polite" className="flex items-center">
                          {status === "saved" && !dirty ? (
                            <Badge tone="success">Sparat ✓</Badge>
                          ) : dirty && status !== "saving" ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
                              <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />
                              Ej sparat
                            </span>
                          ) : null}
                        </span>
                        <Button
                          size="sm"
                          variant={dirty ? "primary" : "secondary"}
                          onClick={() => saveGroup(group)}
                          disabled={!dirty || status === "saving" || savingAll}
                        >
                          {status === "saving" ? "Sparar…" : "Spara"}
                        </Button>
                      </>
                    }
                  >
                    <CardTitle id={titleId}>{group.title}</CardTitle>
                    {description ? <CardDescription>{description}</CardDescription> : null}
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {status === "error" && groupError[group.key] ? (
                      <Alert tone="danger">{groupError[group.key]}</Alert>
                    ) : null}

                    {group.blocks.map((block) => (
                      <BlockField
                        key={block.id}
                        block={block}
                        siteId={siteId}
                        value={values[block.id] ?? ""}
                        alt={alts[block.id] ?? ""}
                        dirty={isBlockDirty(block)}
                        onChange={(value) => handleChange(block.id, value)}
                        onImageChange={(next) => handleImageChange(block.id, next)}
                      />
                    ))}
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>

        {/* Sparrad: sticky inuti innehållskolumnen – aldrig fixed över sidomenyn. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 -mb-6 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:-mb-8 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div aria-live="polite" className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {undoNotice && !anyDirty ? (
                <span className="text-neutral-600">{undoNotice}</span>
              ) : anyDirty ? (
                <span className="flex items-center gap-2 font-medium text-amber-700">
                  <span aria-hidden className="size-2 rounded-full bg-amber-500" />
                  {unsavedLabel(dirtyCount)}
                </span>
              ) : lastSave?.undoId ? (
                <>
                  <span className="flex items-center gap-1.5 text-neutral-700">
                    <CircleCheck aria-hidden className="size-4 text-emerald-600" />
                    Sparat på sajten
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Undo2 />}
                    loading={undoing}
                    onClick={() => lastSave && undoSave(lastSave)}
                    className="-ml-1"
                  >
                    {undoing ? "Ångrar…" : "Ångra"}
                  </Button>
                  {pageUrl ? (
                    <a
                      href={pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md text-sm text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                    >
                      Visa sidan
                      <ExternalLink aria-hidden className="size-3.5" />
                      <span className="sr-only">(öppnas i ny flik)</span>
                    </a>
                  ) : null}
                </>
              ) : savingAll ? (
                <span className="text-neutral-500">Sparar…</span>
              ) : (
                <span className="text-neutral-500">Inga osparade ändringar</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 text-xs text-neutral-500 sm:flex">
                <Kbd>{isMac ? "⌘S" : "Ctrl+S"}</Kbd>
              </span>
              <Button onClick={() => saveAll()} disabled={!anyDirty} loading={savingAll}>
                {savingAll ? "Sparar hela sidan…" : "Spara hela sidan"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sektionsnavigering (desktop) */}
      <aside aria-label="Sektioner på sidan" className="hidden w-56 shrink-0 lg:block">
        <nav className="sticky top-20">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            På den här sidan
          </p>
          <ul className="space-y-0.5 border-l border-neutral-200">
            {groups.map((group) => {
              const status = groupStatus[group.key] ?? "idle";
              const dirty = changedInGroup(group).length > 0;
              const active = activeGroup === group.key;
              return (
                <li key={group.key}>
                  <a
                    href={`#${groupAnchor(group.key)}`}
                    onClick={(event) => scrollToGroup(event, group.key)}
                    aria-current={active ? "location" : undefined}
                    className={cn(
                      "-ml-px flex items-center justify-between gap-2 rounded-r-md border-l-2 py-1.5 pr-2 pl-3 text-sm transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                      active
                        ? "border-brand-600 font-medium text-brand-700"
                        : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900",
                    )}
                  >
                    <span className="truncate">{group.title}</span>
                    {dirty ? (
                      <span
                        title="Osparade ändringar"
                        className="size-2 shrink-0 rounded-full bg-amber-500"
                      >
                        <span className="sr-only">(osparade ändringar)</span>
                      </span>
                    ) : status === "saved" ? (
                      <Check aria-label="Sparat" className="size-4 shrink-0 text-emerald-600" />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
          {anyDirty ? (
            <p className="mt-4 px-3 text-xs text-neutral-500">
              {unsavedLabel(dirtyCount)} – spara med knappen längst ner eller{" "}
              <span className="whitespace-nowrap">{isMac ? "⌘S" : "Ctrl+S"}</span>.
            </p>
          ) : null}
        </nav>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fält
// ---------------------------------------------------------------------------

function DirtyDot({ dirty }: { dirty: boolean }) {
  if (!dirty) return null;
  return <span aria-hidden title="Osparad ändring" className="inline-block size-2 shrink-0 rounded-full bg-amber-500" />;
}

function FieldLabel({ label, dirty }: { label: string; dirty: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {label}
      <DirtyDot dirty={dirty} />
    </span>
  );
}

function BlockField({
  block,
  siteId,
  value,
  alt,
  dirty,
  onChange,
  onImageChange,
}: {
  block: BlockDTO;
  siteId: string;
  value: string;
  alt: string;
  dirty: boolean;
  onChange: (value: string) => void;
  onImageChange: (next: { value: string; alt: string }) => void;
}) {
  const label = fieldLabel(block.key);
  const hint = fieldHint(block.key);
  const { hintId } = fieldIds(block.id);

  if (block.type === "image" || block.type === "richtext") {
    // Bild och formaterad text är inga enskilda formulärfält – etiketten
    // kopplas till gruppen i stället för till ett id.
    const labelId = `${block.id}-label`;
    return (
      <div role="group" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined} className="space-y-1.5">
        <div id={labelId} className="text-sm font-medium text-neutral-800">
          <FieldLabel label={label} dirty={dirty} />
        </div>
        {hint ? (
          <p id={hintId} className="text-xs text-neutral-500">
            {hint}
          </p>
        ) : null}
        {block.type === "image" ? (
          <ImageField siteId={siteId} value={value} alt={alt} onChange={onImageChange} />
        ) : (
          <RichTextEditor value={value} onChange={onChange} ariaLabel={label} placeholder="Skriv texten här…" />
        )}
      </div>
    );
  }

  return (
    <Field htmlFor={block.id} label={<FieldLabel label={label} dirty={dirty} />} hint={hint}>
      <TextBlockControl id={block.id} value={value} onChange={onChange} describedBy={hint ? hintId : undefined} />
    </Field>
  );
}

/**
 * Kort text → input, lång text (> 60 tecken) eller radbrytning → växande
 * textarea. När ett fält växer förbi gränsen medan man skriver byts
 * elementet, och då flyttas fokus och markör med så att skrivandet inte
 * avbryts. Ett fält som blivit textarea förblir det tills sidan laddas om.
 */
function TextBlockControl({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}) {
  const wantsTextarea = value.length > TEXT_TO_TEXTAREA_THRESHOLD || value.includes("\n");
  const [stickyTextarea, setStickyTextarea] = useState(wantsTextarea);
  if (wantsTextarea && !stickyTextarea) setStickyTextarea(true);
  const asTextarea = wantsTextarea || stickyTextarea;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    const caret = pendingCaret.current;
    if (!asTextarea || !el || caret === null) return;
    pendingCaret.current = null;
    el.focus();
    el.setSelectionRange(caret, caret);
  }, [asTextarea]);

  if (asTextarea) {
    return (
      <AutoTextarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={onChange}
        minRows={2}
        aria-describedby={describedBy}
      />
    );
  }

  return (
    <Input
      id={id}
      type="text"
      value={value}
      aria-describedby={describedBy}
      onChange={(event) => {
        const next = event.target.value;
        if (
          (next.length > TEXT_TO_TEXTAREA_THRESHOLD || next.includes("\n")) &&
          document.activeElement === event.target
        ) {
          pendingCaret.current = event.target.selectionStart ?? next.length;
        }
        onChange(next);
      }}
    />
  );
}
