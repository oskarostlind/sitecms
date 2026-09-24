import { cn } from "@/lib/cn";

export type EmptyStateProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** lucide-ikon, t.ex. `<FileText />` – storleken sätts till 20px. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primär åtgärd, t.ex. en `Button` eller `ButtonLink`. */
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 [&>svg]:size-5"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
