import { useId } from "react";
import { cn } from "@/lib/cn";

export type LogoProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Höjd på märket i px (default 28). */
  size?: number;
  /** Visa ordmärket "sitecms" bredvid (default true). */
  withWordmark?: boolean;
  /** "dark" = ljus text för mörk bakgrund (rymdnavy), "light" = mörk text för ljus bakgrund. */
  tone?: "light" | "dark";
};

/**
 * sitecms-märket: en topp i två lager (▲ + bas) i mintgradient, samma
 * form som public/logo-mark.svg och app/icon.svg. Ren SVG, ingen bildfil.
 * Unikt gradient-id per instans (useId): ett fast id bryts om första
 * förekomsten ligger i ett dolt element (display:none), t.ex. mobilheadern.
 */
export function LogoMark({ size = 28, className, title }: { size?: number; className?: string; title?: string }) {
  const gid = `sitecms-logo-g-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cf5bb" />
          <stop offset="1" stopColor="#22c983" />
        </linearGradient>
      </defs>
      <g fill={`url(#${gid})`} stroke={`url(#${gid})`} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M16 3.8 L22.6 15 L9.4 15 Z" />
        <path d="M8 18 L24 18 L29 27 L3 27 Z" />
      </g>
    </svg>
  );
}

export function Logo({ size = 28, withWordmark = true, tone = "light", className, ...props }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <LogoMark size={size} title={withWordmark ? undefined : "sitecms"} />
      {withWordmark ? (
        <span
          className={cn("font-extrabold tracking-[-0.02em]", tone === "dark" ? "text-ink" : "text-space-950")}
          style={{ fontSize: Math.round(size * 0.68), lineHeight: 1 }}
        >
          sitecms
        </span>
      ) : null}
    </span>
  );
}
