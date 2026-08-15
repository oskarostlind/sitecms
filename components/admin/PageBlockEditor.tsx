"use client";

import { useMemo, useRef, useState } from "react";
import { updateBlocks } from "@/lib/actions/pages";
import { fieldLabel } from "@/components/admin/labels";
import AutoTextarea from "@/components/admin/AutoTextarea";
import ImageBlockField from "@/components/admin/ImageBlockField";
import type { BlockGroupDTO } from "@/components/admin/types";

type GroupStatus = "idle" | "saving" | "saved" | "error";

const TEXT_TO_TEXTAREA_THRESHOLD = 60;

export default function PageBlockEditor({
  siteId,
  groups,
}: {
  siteId: string;
  groups: BlockGroupDTO[];
}) {
  const initialValues = useMemo(() => {
    const map: Record<string, string> = {};
    for (const group of groups) {
      for (const block of group.blocks) {
        map[block.id] = block.value;
      }
    }
    return map;
  }, [groups]);

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const originalValues = useRef<Record<string, string>>({ ...initialValues });
  const [groupStatus, setGroupStatus] = useState<Record<string, GroupStatus>>(
    {}
  );
  const [groupError, setGroupError] = useState<Record<string, string>>({});
  const [savingAll, setSavingAll] = useState(false);
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

  function handleImageSaved(blockId: string, url: string) {
    setValues((prev) => ({ ...prev, [blockId]: url }));
    originalValues.current[blockId] = url;
  }

  function changedInGroup(group: BlockGroupDTO) {
    return group.blocks
      .filter((b) => values[b.id] !== originalValues.current[b.id])
      .map((b) => ({ blockId: b.id, value: values[b.id] }));
  }

  const anyDirty = groups.some((g) => changedInGroup(g).length > 0);

  async function saveGroup(group: BlockGroupDTO) {
    const changed = changedInGroup(group);
    if (changed.length === 0) return;

    setStatus(group.key, "saving");
    const result = await updateBlocks(siteId, changed);

    if (!result.ok) {
      setStatus(group.key, "error", result.error);
      return;
    }

    for (const c of changed) {
      originalValues.current[c.blockId] = c.value;
    }
    setStatus(group.key, "saved");
  }

  async function saveAll() {
    const allChanged = groups.flatMap((g) => changedInGroup(g));
    if (allChanged.length === 0) return;

    setSavingAll(true);
    const result = await updateBlocks(siteId, allChanged);
    setSavingAll(false);

    if (!result.ok) {
      // Visa felet på samtliga grupper som hade ändringar.
      for (const g of groups) {
        if (changedInGroup(g).length > 0) {
          setStatus(g.key, "error", result.error);
        }
      }
      return;
    }

    for (const c of allChanged) {
      originalValues.current[c.blockId] = c.value;
    }
    for (const g of groups) {
      setStatus(g.key, "saved");
    }
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
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-medium text-neutral-900">{group.title}</h2>
              <div className="flex items-center gap-3">
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

            <div className="mt-4 space-y-4">
              {group.blocks.map((block) => (
                <div key={block.id}>
                  <label className="mb-1 block text-sm font-medium text-neutral-700">
                    {fieldLabel(block.key)}
                  </label>

                  {block.type === "image" ? (
                    <ImageBlockField
                      siteId={siteId}
                      blockId={block.id}
                      value={values[block.id] ?? ""}
                      onSaved={handleImageSaved}
                    />
                  ) : block.type === "richtext" ? (
                    <AutoTextarea
                      value={values[block.id] ?? ""}
                      onChange={(v) => handleChange(block.id, v)}
                      minRows={4}
                    />
                  ) : (values[block.id] ?? "").length >
                      TEXT_TO_TEXTAREA_THRESHOLD ||
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
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-3 px-4 py-3 md:px-8">
            {!anyDirty && !savingAll && (
              <span className="text-sm text-neutral-400">
                Inga osparade ändringar
              </span>
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
