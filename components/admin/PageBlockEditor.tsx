"use client";

import { useMemo, useRef, useState } from "react";
import { updateBlocks, type BlockUpdate } from "@/lib/actions/pages";
import { undoActivity } from "@/lib/actions/undo";
import { fieldLabel } from "@/components/admin/labels";
import AutoTextarea from "@/components/admin/AutoTextarea";
import ImageField from "@/components/admin/ImageField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { BlockGroupDTO } from "@/components/admin/types";

type GroupStatus = "idle" | "saving" | "saved" | "error";

/** Ögonblicksbild av vad som stod i fälten innan senaste sparning. */
type SavedSnapshot = {
  undoId: string | null;
  blocks: { blockId: string; value: string; alt: string }[];
  groupKeys: string[];
};

const TEXT_TO_TEXTAREA_THRESHOLD = 60;

export default function PageBlockEditor({
  siteId,
  groups,
}: {
  siteId: string;
  groups: BlockGroupDTO[];
}) {
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
  // Senaste sparningen — grunden för "Ångra" i sparraden längst ner.
  const [lastSave, setLastSave] = useState<SavedSnapshot | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undoNotice, setUndoNotice] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function setStatus(groupKey: string, status: GroupStatus, message?: string) {
    setGroupStatus((prev) => ({ ...prev, [groupKey]: status }));
    setGroupError((prev) => ({ ...prev, [groupKey]: message ?? "" }));
    if (timers.current[groupKey]) clearTimeout(timers.current[groupKey]);
    if (status === "saved") {
      timers.current[groupKey] = setTimeout(() => {
        setGroupStatus((prev) => ({ ...prev, [groupKey]: "idle" }));
      }, 2500);
    }
  }

  function handleChange(blockId: string, value: string) {
    setValues((prev) => ({ ...prev, [blockId]: value }));
  }

  function handleImageChange(blockId: string, next: { value: string; alt: string }) {
    setValues((prev) => ({ ...prev, [blockId]: next.value }));
    setAlts((prev) => ({ ...prev, [blockId]: next.alt }));
  }

  function changedInGroup(group: BlockGroupDTO): BlockUpdate[] {
    return group.blocks
      .filter(
        (block) =>
          values[block.id] !== originalValues.current[block.id] ||
          alts[block.id] !== originalAlts.current[block.id]
      )
      .map((block) => ({
        blockId: block.id,
        value: values[block.id] ?? "",
        // Alt-texten hör bara till bildblock; övriga block lämnar kolumnen orörd.
        ...(block.type === "image" ? { alt: alts[block.id] ?? "" } : {}),
      }));
  }

  const anyDirty = groups.some((group) => changedInGroup(group).length > 0);

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

  async function saveGroup(group: BlockGroupDTO) {
    const changed = changedInGroup(group);
    if (changed.length === 0) return;

    const before = snapshotOf(changed);
    setStatus(group.key, "saving");
    setUndoNotice(null);

    const result = await updateBlocks(siteId, changed);

    if (!result.ok) {
      setStatus(group.key, "error", result.error);
      return;
    }

    commit(changed);
    setStatus(group.key, "saved");
    setLastSave({ undoId: result.undoId, blocks: before, groupKeys: [group.key] });
  }

  async function saveAll() {
    const allChanged = groups.flatMap((group) => changedInGroup(group));
    if (allChanged.length === 0) return;

    const before = snapshotOf(allChanged);
    const dirtyGroups = groups
      .filter((group) => changedInGroup(group).length > 0)
      .map((group) => group.key);

    setSavingAll(true);
    setUndoNotice(null);
    const result = await updateBlocks(siteId, allChanged);
    setSavingAll(false);

    if (!result.ok) {
      // Visa felet på samtliga grupper som hade ändringar.
      for (const key of dirtyGroups) {
        setStatus(key, "error", result.error);
      }
      return;
    }

    commit(allChanged);
    for (const key of dirtyGroups) {
      setStatus(key, "saved");
    }
    setLastSave({ undoId: result.undoId, blocks: before, groupKeys: dirtyGroups });
  }

  async function undoLastSave() {
    if (!lastSave?.undoId) return;

    setUndoing(true);
    const result = await undoActivity(lastSave.undoId);
    setUndoing(false);

    if (!result.ok) {
      for (const key of lastSave.groupKeys) {
        setStatus(key, "error", result.error);
      }
      return;
    }

    // Skriv tillbaka de gamla värdena i fälten så att det kunden ser stämmer
    // med det som nu ligger i databasen.
    setValues((prev) => {
      const next = { ...prev };
      for (const block of lastSave.blocks) next[block.blockId] = block.value;
      return next;
    });
    setAlts((prev) => {
      const next = { ...prev };
      for (const block of lastSave.blocks) next[block.blockId] = block.alt;
      return next;
    });
    for (const block of lastSave.blocks) {
      originalValues.current[block.blockId] = block.value;
      originalAlts.current[block.blockId] = block.alt;
    }

    setLastSave(null);
    setUndoNotice("Ändringen är ångrad.");
  }

  return (
    <div className="space-y-6 pb-24">
      {groups.map((group) => {
        const status = groupStatus[group.key] ?? "idle";
        const dirty = changedInGroup(group).length > 0;

        return (
          <section
            key={group.key}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium text-neutral-900">{group.title}</h2>
              <div className="flex flex-wrap items-center gap-3">
                {status === "saved" && (
                  <span className="text-sm text-emerald-600">Sparat ✓</span>
                )}
                {status === "error" && (
                  <span className="text-sm text-red-600">
                    {groupError[group.key]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => saveGroup(group)}
                  disabled={!dirty || status === "saving"}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {status === "saving" ? "Sparar…" : "Spara"}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-5">
              {group.blocks.map((block) => (
                <div key={block.id}>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    {fieldLabel(block.key)}
                  </label>

                  {block.type === "image" ? (
                    <ImageField
                      siteId={siteId}
                      value={values[block.id] ?? ""}
                      alt={alts[block.id] ?? ""}
                      onChange={(next) => handleImageChange(block.id, next)}
                    />
                  ) : block.type === "richtext" ? (
                    <RichTextEditor
                      value={values[block.id] ?? ""}
                      onChange={(markdown) => handleChange(block.id, markdown)}
                      ariaLabel={fieldLabel(block.key)}
                      placeholder="Skriv texten här…"
                    />
                  ) : (values[block.id] ?? "").length > TEXT_TO_TEXTAREA_THRESHOLD ||
                    (values[block.id] ?? "").includes("\n") ? (
                    <AutoTextarea
                      value={values[block.id] ?? ""}
                      onChange={(v) => handleChange(block.id, v)}
                      minRows={2}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[block.id] ?? ""}
                      onChange={(e) => handleChange(block.id, e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-neutral-500">
            Den här sidan har inget innehåll ännu.
          </p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-neutral-200 bg-white/95 backdrop-blur md:pl-64">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3 md:px-8">
            {undoNotice && (
              <span className="mr-auto text-sm text-neutral-600">{undoNotice}</span>
            )}

            {!undoNotice && lastSave?.undoId && !anyDirty && (
              <span className="mr-auto flex items-center gap-2 text-sm text-neutral-500">
                Sparat på sajten.
                <button
                  type="button"
                  onClick={undoLastSave}
                  disabled={undoing}
                  className="rounded-lg border border-neutral-300 px-2.5 py-1 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {undoing ? "Ångrar…" : "Ångra"}
                </button>
              </span>
            )}

            {anyDirty ? (
              <span className="text-sm text-amber-700">Osparade ändringar</span>
            ) : (
              !lastSave?.undoId &&
              !undoNotice &&
              !savingAll && (
                <span className="text-sm text-neutral-400">
                  Inga osparade ändringar
                </span>
              )
            )}

            <button
              type="button"
              onClick={saveAll}
              disabled={!anyDirty || savingAll}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingAll ? "Sparar hela sidan…" : "Spara hela sidan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
