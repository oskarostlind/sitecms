import { cn } from "@/lib/cn";

export type LogoProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Höjd på märket i px (default 28). */
  size?: number;
  /** Visa ordmärket "sitecms" bredvid (default true). */
  withWordmark?: boolean;
};

/** Blå rundad ruta med ett vitt "s" + ordmärket "sitecms". Ren SVG, ingen bildfil. */
export function Logo({ size = 28, withWordmark = true, className, ...props }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)} {...props}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        role={withWordmark ? undefined : "img"}
        aria-label={withWordmark ? undefined : "sitecms"}
        aria-hidden={withWordmark ? true : undefined}
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" className="fill-brand-600" />
        <text
          x="16"
          y="22.5"
          textAnchor="middle"
          fill="#fff"
          fontFamily="Inter Variable, ui-sans-serif, system-ui, sans-serif"
          fontSize="22"
          fontWeight="700"
        >
          s
        </text>
      </svg>
      {withWordmark ? (
        <span
          className="font-semibold tracking-tight text-neutral-900"
          style={{ fontSize: Math.round(size * 0.64), lineHeight: 1 }}
        >
          sitecms
        </span>
      ) : null}
    </span>
  );
}
