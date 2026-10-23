"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Platshållaren som visas när sajten saknar domän – då finns ingen ikon att hämta. */
const PLACEHOLDER_HOST = "din-sajt.se";

/**
 * Ikonvägar som provas i tur och ordning: den klassiska `/favicon.ico` och
 * Next.js App Router-konventionen `app/icon.png` (serveras som `/icon.png`).
 */
const ICON_PATHS = ["/favicon.ico", "/icon.png"] as const;

type SiteFaviconProps = {
  /** Sajtens värd utan protokoll, t.ex. `jjbyggboden.se`. */
  host: string;
  /** Bokstaven som visas om ingen ikon går att ladda. */
  fallback: string;
  className?: string;
};

/**
 * Kundsajtens favicon i SERP-förhandsvisningen, så som Google visar den.
 * Faller tillbaka på en grå cirkel med `fallback` om ingen ikon laddar.
 * Alla lägen tar samma 28 px-ruta, så layouten hoppar inte.
 *
 * Vanlig `<img>` med flit: domänerna är kundernas och ska inte in i
 * `images.remotePatterns`.
 */
export function SiteFavicon({ host, fallback, className }: SiteFaviconProps) {
  const cleanHost = host.trim();
  const hasHost = cleanHost !== "" && cleanHost !== PLACEHOLDER_HOST;

  // Försöket hör till en viss värd; byts värden börjar vi om från första vägen.
  const [attempt, setAttempt] = useState({ host: cleanHost, index: 0 });
  const index = attempt.host === cleanHost ? attempt.index : 0;
  const src = hasHost && index < ICON_PATHS.length ? `https://${cleanHost}${ICON_PATHS[index]}` : null;

  const imgRef = useRef<HTMLImageElement>(null);

  const handleError = () => setAttempt({ host: cleanHost, index: index + 1 });

  // En bild som redan hann misslyckas innan React hydrerade triggar aldrig
  // onError – fånga det läget när komponenten monteras.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) handleError();
  }, [src]);

  if (!src) {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200",
          className,
        )}
      >
        {fallback}
      </span>
    );
  }

  return (
    <img
      ref={imgRef}
      key={src}
      src={src}
      alt=""
      width={28}
      height={28}
      className={cn("size-7 shrink-0 rounded-full bg-white object-contain ring-1 ring-neutral-200", className)}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={handleError}
    />
  );
}
