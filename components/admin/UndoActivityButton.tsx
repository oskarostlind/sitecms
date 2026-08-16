"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { undoActivity } from "@/lib/actions/undo";

/**
 * "Ångra" i aktivitetsloggen. Återställer innehållet till ögonblicksbilden
 * som sparades när ändringen gjordes. Bekräftar först — det här skriver om
 * innehåll på en skarp sajt — och laddar om listan efteråt så att raden
 * visas som ångrad.
 */
export default function UndoActivityButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const confirmed = window.confirm(
      "Ångra den här ändringen? Innehållet återställs till hur det såg ut innan."
    );
    if (!confirmed) return;

    setWorking(true);
    setError(null);
    const result = await undoActivity(logId);
    setWorking(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    startTransition(() => router.refresh());
  }

  const busy = working || isPending;

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Ångrar…" : "Ångra"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
