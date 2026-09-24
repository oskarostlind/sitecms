import { cn } from "@/lib/cn";

export type CardProps = React.ComponentProps<"div"> & {
  /** Klickbart kort: lägger till hover-skugga. */
  interactive?: boolean;
};

export function Card({ interactive, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white shadow-sm",
        interactive && "transition-shadow duration-150 hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}

export type CardHeaderProps = React.ComponentProps<"div"> & {
  /** Knappar/länkar till höger om rubriken. */
  actions?: React.ReactNode;
};

export function CardHeader({ actions, className, children, ...props }: CardHeaderProps) {
  return (
    <div
      data-card-header=""
      className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6 sm:pt-6", className)}
      {...props}
    >
      <div className="min-w-0 flex-1 space-y-1">{children}</div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold text-neutral-900", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-neutral-500", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 sm:p-6 [[data-card-header]+&]:pt-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-neutral-200 bg-neutral-50/60 px-5 py-3 sm:px-6",
        className,
      )}
      {...props}
    />
  );
}
