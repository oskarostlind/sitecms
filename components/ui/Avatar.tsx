import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

export type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  /** Namn eller e-post – initialerna räknas ut härifrån. */
  name: string | null | undefined;
  /** Storlek i px (default 32). */
  size?: number;
};

export function Avatar({ name, size = 32, className, style, ...props }: AvatarProps) {
  return (
    <span
      aria-hidden
      title={name ?? undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700 ring-1 ring-brand-100",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)), ...style }}
      {...props}
    >
      {initials(name)}
    </span>
  );
}
