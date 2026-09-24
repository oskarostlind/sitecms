import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, { badge: string; dot: string }> = {
  neutral: { badge: "border-neutral-200 bg-neutral-100 text-neutral-700", dot: "bg-neutral-400" },
  brand: { badge: "border-brand-200 bg-brand-50 text-brand-700", dot: "bg-brand-500" },
  success: { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  danger: { badge: "border-red-200 bg-red-50 text-red-700", dot: "bg-red-500" },
};

export type BadgeProps = React.ComponentProps<"span"> & {
  /** Publicerad = success, Utkast = neutral, Admin = brand, Kund = neutral, Dold = warning. */
  tone?: BadgeTone;
  /** Liten statusprick före texten. */
  dot?: boolean;
};

export function Badge({ tone = "neutral", dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone].badge,
        className,
      )}
      {...props}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", tones[tone].dot)} /> : null}
      {children}
    </span>
  );
}
