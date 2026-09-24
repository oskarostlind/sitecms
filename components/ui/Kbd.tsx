import { cn } from "@/lib/cn";

/** Liten tangent-badge, t.ex. `<Kbd>Ctrl+S</Kbd>`. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-neutral-300 border-b-2 bg-white px-1.5 font-sans text-[11px] font-medium text-neutral-600",
        className,
      )}
      {...props}
    />
  );
}
