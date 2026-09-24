import { cn } from "@/lib/cn";

export type CheckboxProps = Omit<React.ComponentProps<"input">, "type"> & {
  invalid?: boolean;
  /** Valfri etikett till höger. Utan etikett: koppla en egen `<label>` eller sätt `aria-label`. */
  label?: React.ReactNode;
  /** Hjälptext under etiketten. */
  description?: React.ReactNode;
};

const boxClass =
  "size-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-brand-600 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Checkbox({ invalid, label, description, className, id, "aria-invalid": ariaInvalid, ...props }: CheckboxProps) {
  const input = (
    <input
      type="checkbox"
      id={id}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(boxClass, invalid && "outline outline-2 outline-red-400", !label && className)}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      <span className="flex h-5 items-center">{input}</span>
      <span className="text-sm">
        <span className="font-medium text-neutral-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-neutral-500">{description}</span> : null}
      </span>
    </label>
  );
}
