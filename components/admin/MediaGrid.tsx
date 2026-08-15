"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMedia } from "@/lib/actions/media";
import { formatMaxUploadSize } from "@/lib/actions/upload";

export type MediaItemDTO = {
  id: string;
  url: string;
  filename: string;
  contentType: string | null;
  size: number | null;
  createdAt: string; // ISO
};

function formatSize(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function isImage(contentType: string | null): boolean {
  return !!contentType && contentType.startsWith("image/");
}

export default function MediaGrid({
  siteId,
  items,
}: {
  siteId: string;
  items: MediaItemDTO[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState(items);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gör det möjligt att välja samma fil igen
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Uppladdningen misslyckades.");
        return;
      }

      // API-routen returnerar bara { url }, inte hela media-raden. Hämta
      // fräscha props från servern så listan (id, storlek, datum m.m.)
      // stämmer med databasen.
      router.refresh();
    } catch {
      setError("Något gick fel. Kontrollera din uppkoppling och försök igen.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: MediaItemDTO) {
    const confirmed = window.confirm(
      `Ta bort "${item.filename}"? Det här går inte att ångra.`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setError(null);

    try {
      const result = await deleteMedia(siteId, item.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
      router.refresh();
    } catch {
      setError("Kunde inte ta bort filen. Försök igen.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopyUrl(item: MediaItemDTO) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 2000);
    } catch {
      setError("Kunde inte kopiera länken.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Mediabibliotek</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Bilder och filer som laddats upp till den här sajten.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Laddar upp…" : "Ladda upp fil"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      <p className="text-xs text-neutral-400">
        JPG, PNG, WEBP, GIF eller SVG. Max {formatMaxUploadSize()}.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {localItems.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          Inga filer ännu. Klicka på &quot;Ladda upp fil&quot; för att lägga till din första.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {localItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            >
              <div className="flex h-32 w-full items-center justify-center overflow-hidden bg-neutral-100">
                {isImage(item.contentType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-neutral-400">Ingen förhandsvisning</span>
                )}
              </div>

              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-medium text-neutral-900" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatSize(item.size)} · {formatDate(item.createdAt)}
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item)}
                    className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    {copiedId === item.id ? "Kopierat ✓" : "Kopiera URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? "Tar bort…" : "Ta bort"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
