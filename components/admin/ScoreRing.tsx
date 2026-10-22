import { cn } from "@/lib/cn";
import type { BadgeTone } from "@/components/ui";

/** Ton för en SEO-poäng: ≥ 80 grön, 50–79 amber, < 50 röd (docs/SEO-TRAFIK.md §8). */
export function scoreTone(score: number): Extract<BadgeTone, "success" | "warning" | "danger"> {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

/** Samma färgvärden som `Badge`/`Alert` använder för respektive ton. */
export const scoreToneClasses: Record<ReturnType<typeof scoreTone>, { text: string; ring: string; track: string }> = {
  success: { text: "text-emerald-700", ring: "text-emerald-500", track: "text-emerald-100" },
  warning: { text: "text-amber-800", ring: "text-amber-500", track: "text-amber-100" },
  danger: { text: "text-red-700", ring: "text-red-500", track: "text-red-100" },
};

/** Textfärg för en poängsiffra (stat-rutor, badges). */
export function scoreTextClass(score: number): string {
  return scoreToneClasses[scoreTone(score)].text;
}

/** Kort ord för tonen – används som förklaring intill siffran. */
export function scoreLabel(score: number): string {
  const tone = scoreTone(score);
  return tone === "success" ? "Bra" : tone === "warning" ? "Okej" : "Behöver jobb";
}

export type ScoreRingProps = {
  /** 0–100. */
  score: number;
  /** Diameter i px (default 120). */
  size?: number;
  className?: string;
  /** Beskrivning för skärmläsare; default "SEO-poäng {score} av 100". */
  ariaLabel?: string;
};

/**
 * Stor poängsiffra i en ring som fylls i proportion till poängen. Inline-SVG,
 * serverkomponent. Färgton efter `scoreTone`.
 */
export function ScoreRing({ score, size = 120, className, ariaLabel }: ScoreRingProps) {
  const value = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
  const tone = scoreToneClasses[scoreTone(value)];
  const stroke = 8;
  const radius = (100 - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div
      role="img"
      aria-label={ariaLabel ?? `SEO-poäng ${value} av 100`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full -rotate-90">
        <circle cx={50} cy={50} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className={tone.track} />
        <circle
          cx={50}
          cy={50}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className={tone.ring}
        />
      </svg>
      <span
        className={cn("relative font-semibold tabular-nums leading-none tracking-tight", tone.text)}
        style={{ fontSize: Math.round(size * 0.34) }}
      >
        {value}
      </span>
    </div>
  );
}
