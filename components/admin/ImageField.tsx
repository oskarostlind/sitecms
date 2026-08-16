"use client";

import { useId, useRef, useState } from "react";
import { formatMaxUploadSize } from "@/lib/actions/upload";

/**
 * Bildfält: ladda upp från datorn eller telefonen, se bilden direkt, skriv en
 * beskrivning (alt-text) och ta bort. Används överallt där en bild väljs —
 * sidblock och omslagsbild på inlägg — så att kunden möter samma sak varje
 * gång och aldrig behöver leta fram en URL.
 *
 * Komponenten sparar ingenting själv: den laddar upp filen och rapporterar
 * { value, alt } uppåt. Anroparen bestämmer när det skrivs till databasen.
 */

type ImageFieldProps = {
  siteId: string;
  /** Bildens URL ("" = ingen bild vald). */
  value: string;
  /** Alt-texten som hör till bilden. */
  alt: string;
  onChange: (next: { value: string; alt: string }) => void;
  altLabel?: string;
  altPlaceholder?: string;
};

export default function ImageField({
  siteId,
  value,
  alt,
  onChange,
  altLabel = "Bildbeskrivning (alt-text)",
  altPlaceholder = "T.ex. Nybyggd altan i lärkträ sedd från trädgården",
}: ImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const altId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("siteId", siteId);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Uppladdningen misslyckades.");
        return;
      }

      onChange({ value: data.url as string, alt });
    } catch {
      setError("Något gick fel. Kontrollera din uppkoppling och försök igen.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // gör det möjligt att välja samma fil igen
    if (file) void upload(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Det där ser inte ut som en bild. Använd JPG, PNG, WEBP, GIF eller SVG.");
      return;
    }
    void upload(file);
  }

  const missingAlt = Boolean(value) && alt.trim().length === 0;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`overflow-hidden rounded-xl border border-dashed transition-colors ${
          dragOver ? "border-neutral-500 bg-neutral-100" : "border-neutral-300 bg-neutral-50"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={alt} className="h-44 w-full bg-neutral-100 object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-44 w-full flex-col items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="8.5" cy="9.5" r="1.5" />
              <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L16 17" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-medium">
              {uploading ? "Laddar upp…" : "Välj en bild"}
            </span>
            <span className="text-xs text-neutral-400">
              eller dra hit en fil från datorn
            </span>
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? "Laddar upp…" : value ? "Byt bild" : "Ladda upp bild"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange({ value: "", alt: "" })}
            disabled={uploading}
            className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:text-red-700 disabled:cursor-not-allowed"
          >
            Ta bort bild
          </button>
        )}

        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <p className="mt-1 text-xs text-neutral-400">
        JPG, PNG, WEBP, GIF eller SVG. Max {formatMaxUploadSize()}.
      </p>

      {/* Beskrivningen hör till en bild — utan bild finns inget att beskriva. */}
      <div className={value ? "mt-3" : "hidden"}>
        <label htmlFor={altId} className="block text-sm font-medium text-neutral-700">
          {altLabel}
        </label>
        <input
          id={altId}
          type="text"
          value={alt}
          onChange={(event) => onChange({ value, alt: event.target.value })}
          placeholder={altPlaceholder}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Beskriv kort vad bilden visar. Texten läses upp för besökare med
          skärmläsare och hjälper Google att förstå bilden.
        </p>
        {missingAlt && (
          <p className="mt-1 text-xs text-amber-700">
            Bilden saknar beskrivning.
          </p>
        )}
      </div>

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
