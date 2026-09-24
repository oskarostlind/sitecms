import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldBase, fieldInvalid } from "./fieldStyles";

export type SelectProps = React.ComponentProps<"select"> & {
  invalid?: boolean;
  /** Klasser för wrappern (bredd/marginal). `className` hamnar på själva `<select>`. */
  wrapperClassName?: string;
};

export function Select({ invalid, className, wrapperClassName, children, "aria-invalid": ariaInvalid, ...props }: SelectProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        aria-invalid={invalid || ariaInvalid || undefined}
        className={cn(fieldBase, "h-10 appearance-none pl-3 pr-9", invalid && fieldInvalid, className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500"
      />
    </div>
  );
}
