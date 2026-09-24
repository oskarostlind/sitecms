import { cn } from "@/lib/cn";
import { fieldBase, fieldInvalid } from "./fieldStyles";

export type TextareaProps = React.ComponentProps<"textarea"> & {
  invalid?: boolean;
};

export function Textarea({ invalid, className, rows = 4, "aria-invalid": ariaInvalid, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(fieldBase, "min-h-20 px-3 py-2 leading-relaxed", invalid && fieldInvalid, className)}
      {...props}
    />
  );
}
