"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { deleteMedia } from "@/lib/actions/media";
import { formatMaxUploadSize } from "@/lib/actions/upload";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Alert, Button, EmptyState, PageHeader, Spinner, useToast } from "@/components/ui";

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

function isImage(contentType: string | null): boolean {
  return !!contentType && contentType.startsWith("image/");
}

function isSvg(contentType: string | null): boolean {
  return contentType === "image/svg+xml";
}

export default function MediaGrid({
  siteId,
  items,
}: {
  siteId: string;
  items: MediaItemDTO[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localItems, setLocalItems] = useState(items);

  // Håll listan i synk med servern (t.ex. efter router.refresh() vid uppladdning).
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  async function uploadFile(file: File) {
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

      toast({ title: "Uppladdad", tone: "success" });
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gör det möjligt att välja samma fil igen
    if (file) void uploadFile(file);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    dragCounter.current += 1;
    setDragOver(true);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) void uploadFile(file);
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
      toast({ title: "Länk kopierad", tone: "success" });
    } catch {
      setError("Kunde inte kopiera länken.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mediabibliotek"
        description={`Bilder som laddats upp till den här sajten. JPG, PNG, WEBP, GIF eller SVG – max ${formatMaxUploadSize()}.`}
        actions={
          <Button icon={<Upload />} loading={uploading} onClick={() => inputRef.current?.click()}>
            Ladda upp fil
          </Button>
        }
      />

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {uploading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Spinner />
          Laddar upp…
        </div>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed p-3 transition-colors duration-150",
          dragOver ? "border-brand-600 bg-brand-50" : "border-transparent",
        )}
      >
        {localItems.length === 0 ? (
          <EmptyState
            icon={<ImageIcon />}
            title="Inga filer ännu"
            description="Dra in en bild här eller klicka på Ladda upp fil."
            action={
              <Button icon={<Upload />} onClick={() => inputRef.current?.click()}>
                Ladda upp fil
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {localItems.map((item) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="aspect-square w-full overflow-hidden bg-neutral-100">
                  {isImage(item.contentType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.filename}
                      className={cn("h-full w-full", isSvg(item.contentType) ? "object-contain p-4" : "object-cover")}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      Ingen förhandsvisning
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "absolute inset-x-0 top-0 flex items-center justify-end gap-1 bg-gradient-to-b from-black/45 to-transparent p-2",
                    "opacity-100 transition-opacity duration-150 md:opacity-0 md:focus-within:opacity-100 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item)}
                    aria-label="Kopiera länk"
                    className="inline-flex size-7 items-center justify-center rounded-md bg-white/95 text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  >
                    <Copy aria-hidden className="size-4" />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Öppna"
                    className="inline-flex size-7 items-center justify-center rounded-md bg-white/95 text-neutral-700 shadow-sm ring-1 ring-neutral-200 transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label="Ta bort"
                    className="inline-flex size-7 items-center justify-center rounded-md bg-white/95 text-red-600 shadow-sm ring-1 ring-red-200 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 disabled:opacity-50"
                  >
                    {deletingId === item.id ? (
                      <Spinner size={14} />
                    ) : (
                      <Trash2 aria-hidden className="size-4" />
                    )}
                    <span className="sr-only">Ta bort</span>
                  </button>
                </div>

                <div className="space-y-0.5 p-2.5">
                  <p className="truncate text-xs font-medium text-neutral-900" title={item.filename}>
                    {item.filename}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {formatSize(item.size)} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
