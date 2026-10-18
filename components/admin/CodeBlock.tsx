import { cn } from "@/lib/cn";
import { CopyButton } from "./CopyButton";

export type CodeBlockProps = {
  /** Koden som visas och kopieras. */
  code: string;
  /** Filnamn eller rubrik i listen ovanför koden, t.ex. "lib/sitecms.ts". */
  filename?: string;
  /** Språket som en liten etikett (ts, tsx, bash, json, env). */
  language?: string;
  /** Maxhöjd innan koden scrollar (default 28rem). `null` = ingen gräns. */
  maxHeight?: string | null;
  /** Kopierar ett annat värde än det som visas (t.ex. maskerade nycklar). */
  copyValue?: string;
  className?: string;
};

/**
 * Kodruta med monospace, filnamn och kopiera-knapp. Serverkomponent — bara
 * knappen är klientkod, så den fungerar både i panelen och på /docs.
 */
export function CodeBlock({ code, filename, language, maxHeight = "28rem", copyValue, className }: CodeBlockProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-neutral-900 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          {filename ? (
            <span className="truncate font-mono text-xs text-neutral-300" title={filename}>
              {filename}
            </span>
          ) : null}
          {language ? (
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-neutral-400">
              {language}
            </span>
          ) : null}
        </div>
        <CopyButton
          value={copyValue ?? code}
          variant="ghost"
          size="sm"
          className="h-7 text-neutral-300 hover:bg-white/10 hover:text-white"
          aria-label={filename ? `Kopiera ${filename}` : "Kopiera kod"}
        />
      </div>
      <pre
        className="overflow-auto p-4 font-mono text-[13px] leading-relaxed text-neutral-100"
        style={maxHeight ? { maxHeight } : undefined}
        tabIndex={0}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
