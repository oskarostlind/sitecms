import { cn } from "@/lib/cn";
import { fieldBase, fieldInvalid } from "./fieldStyles";

export type InputProps = React.ComponentProps<"input"> & {
  /** Felutseende + `aria-invalid`. */
  invalid?: boolean;
};

export function Input({ invalid, className, "aria-invalid": ariaInvalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(fieldBase, "h-10 px-3", invalid && fieldInvalid, className)}
      {...props}
    />
  );
}
