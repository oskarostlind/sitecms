import { cn } from "@/lib/cn";

/** Pulserande platshållare. Sätt storlek med klasser, t.ex. `className="h-4 w-32"`. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-neutral-200/70", className)} {...props} />;
}
