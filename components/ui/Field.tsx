import { cn } from "@/lib/cn";

export type FieldProps = {
  /** Id på fältet som labeln pekar på. Krävs (Field är server-kompatibel och kan inte generera id). */
  htmlFor: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** T.ex. "46/60" – visas till höger om labeln. */
  count?: React.ReactNode;
  /** Gör räknaren röd. */
  countOver?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Id:n som `Field` sätter på hjälptext och felmeddelande. */
export function fieldIds(htmlFor: string) {
  return { hintId: `${htmlFor}-hint`, errorId: `${htmlFor}-error` };
}

/**
 * Etikett + fält + hjälptext + fel.
 *
 * Field kan inte ändra props på barnet – sätt själv `id={htmlFor}` och
 * `aria-describedby` på fältet med id:n från `fieldIds(htmlFor)`
 * (`${htmlFor}-hint` / `${htmlFor}-error`), samt `invalid` när `error` finns.
 */
export function Field({ htmlFor, label, hint, error, required, count, countOver, className, children }: FieldProps) {
  const { hintId, errorId } = fieldIds(htmlFor);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-800">
          {label}
          {required ? (
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          ) : null}
        </label>
        {count !== undefined && count !== null ? (
          <span className={cn("text-xs tabular-nums", countOver ? "font-medium text-red-600" : "text-neutral-500")}>
            {count}
          </span>
        ) : null}
      </div>
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
