"use client";

import { useRef, useState } from "react";
import { updateBlocks } from "@/lib/actions/pages";
import { formatMaxUploadSize } from "@/lib/actions/upload";

type Status = "idle" | "uploading" | "saved" | "error";

export default function ImageBlockField({
  siteId,
  blockId,
  value,
  onSaved,
}: {
  siteId: string;
  blockId: string;
  value: string;
  onSaved: (blockId: string, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // gör det möjligt att välja samma fil igen
    if (!file) return;

    setStatus("uploading");
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
        setStatus("error");
        setError(data.error ?? "Uppladdningen misslyckades.");
        return;
      }

      const result = await updateBlocks(siteId, [
        { blockId, value: data.url as string },
      ]);

      if (!result.ok) {
        setStatus("error");
        setError(result.error);
        return;
      }

      onSaved(blockId, data.url as string);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      setError("Något gick fel. Kontrollera din uppkoppling och försök igen.");
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-40 w-full object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center text-sm text-neutral-400">
            Ingen bild vald
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "uploading"}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "uploading" ? "Laddar upp…" : "Byt bild"}
        </button>

        {status === "saved" && (
          <span className="text-sm text-emerald-600">Sparat ✓</span>
        )}
        {status === "error" && error && (
          <span className="text-sm text-red-600">{error}</span>
        )}
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        JPG, PNG, WEBP, GIF eller SVG. Max {formatMaxUploadSize()}.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
