import { cn } from "@/lib/cn";

export type TableProps = React.ComponentProps<"table"> & {
  /** Klasser för den scrollbara wrappern. */
  wrapperClassName?: string;
};

export function Table({ wrapperClassName, className, ...props }: TableProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-neutral-200 bg-white", wrapperClassName)}>
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Thead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn(className)} {...props} />;
}

export function Tbody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&>tr:last-child>td]:border-b-0", className)} {...props} />;
}

export type TrProps = React.ComponentProps<"tr"> & {
  /** Hover-bakgrund (default på). */
  hover?: boolean;
};

export function Tr({ hover = true, className, ...props }: TrProps) {
  return <tr className={cn(hover && "transition-colors duration-150 hover:bg-neutral-50", className)} {...props} />;
}

export function Th({ className, scope = "col", ...props }: React.ComponentProps<"th">) {
  return (
    <th
      scope={scope}
      className={cn(
        "whitespace-nowrap border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-neutral-100 px-4 py-3 align-middle text-neutral-800", className)} {...props} />;
}
