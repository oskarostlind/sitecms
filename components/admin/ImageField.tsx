"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, TriangleAlert, Upload } from "lucide-react";
import { formatMaxUploadSize } from "@/lib/actions/upload";
import { Alert, Button, Field, Input, Spinner, fieldIds } from "@/components/ui";
import { cn } from "@/lib/cn";

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
  // Vilken bildadress som inte gick att visa. Jämförs mot nuvarande värde så
  // att en ny bild alltid får ett försök till.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Bilden renderas på servern och kan hinna misslyckas innan React kopplat på
  // onError. Därför kontrolleras laddningsstatus även direkt efter montering.
  useEffect(() => {
    const el = imgRef.current;
    if (!el || !value) return;
    if (el.complete && el.naturalWidth === 0) setBrokenSrc(value);
  }, [value]);

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
  // Äldre innehåll kan peka på en fil som ligger i kundens egen sajt
  // (t.ex. "/hero/bild.jpg"). Den adressen finns inte i panelen, så bilden
  // går inte att visa här — säg det rakt ut i stället för en trasig ikon.
  const broken = Boolean(value) && brokenSrc === value;
  const { hintId } = fieldIds(altId);
  const missingAltId = `${altId}-missing`;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden rounded-lg transition-colors duration-150",
          value && !broken
            ? cn("border bg-neutral-100", dragOver ? "border-brand-600 ring-2 ring-brand-500/30" : "border-neutral-200")
            : cn(
                "border-2 border-dashed",
                dragOver ? "border-brand-600 bg-brand-50" : "border-neutral-300 bg-neutral-50",
              ),
        )}
      >
        {value && broken ? (
          <div className="p-3">
            <Alert tone="info" title="Bilden kan inte visas här" className="bg-white">
              <p>
                Den ligger på din sajt, inte i mediabiblioteket. Ladda upp den här så visas den — och kan
                bytas härifrån i fortsättningen.
              </p>
              <code className="mt-1.5 block max-w-full truncate rounded bg-white/70 px-2 py-1 font-mono text-xs text-neutral-600 ring-1 ring-brand-200">
                {value}
              </code>
            </Alert>
          </div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={value}
            alt={alt}
            onError={() => setBrokenSrc(value)}
            className="aspect-video w-full bg-neutral-100 object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-video max-h-56 w-full flex-col items-center justify-center gap-2 px-4 text-sm text-neutral-600 transition-colors duration-150 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/50 disabled:cursor-not-allowed"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-10 items-center justify-center rounded-full",
                dragOver ? "bg-brand-100 text-brand-700" : "bg-white text-neutral-500 ring-1 ring-neutral-200",
              )}
            >
              {uploading ? <Spinner size={20} /> : <ImagePlus className="size-5" />}
            </span>
            <span className="font-medium">{uploading ? "Laddar upp…" : "Välj en bild"}</span>
            <span className="text-xs text-neutral-500">eller dra hit en fil från datorn</span>
          </button>
        )}

        {/* Uppladdning pågår över en befintlig bild. */}
        {uploading && value ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm ring-1 ring-neutral-200">
              <Spinner />
              Laddar upp…
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={uploading ? undefined : <Upload />}
          loading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Laddar upp…" : value ? "Byt bild" : "Ladda upp bild"}
        </Button>

        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ value: "", alt: "" })}
            disabled={uploading}
            className="text-neutral-600 hover:bg-red-50 hover:text-red-700"
          >
            Ta bort bild
          </Button>
        )}

        <span className="text-xs text-neutral-500">
          JPG, PNG, WEBP, GIF eller SVG. Max {formatMaxUploadSize()}.
        </span>
      </div>

      {error && (
        <Alert tone="danger" className="py-2">
          {error}
        </Alert>
      )}

      {/* Beskrivningen hör till en bild — utan bild finns inget att beskriva. */}
      <div className={value ? undefined : "hidden"}>
        <Field
          htmlFor={altId}
          label={altLabel}
          hint="Beskriv kort vad bilden visar. Texten läses upp för besökare med skärmläsare och hjälper Google att förstå bilden."
        >
          <Input
            id={altId}
            type="text"
            value={alt}
            onChange={(event) => onChange({ value, alt: event.target.value })}
            placeholder={altPlaceholder}
            aria-describedby={missingAlt ? `${hintId} ${missingAltId}` : hintId}
          />
        </Field>
        {missingAlt && (
          <p id={missingAltId} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
            Bilden saknar beskrivning.
          </p>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
    </div>
  );
}
