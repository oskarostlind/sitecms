import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type Breadcrumb = { label: React.ReactNode; href?: string };

export type PageHeaderProps = Omit<React.ComponentProps<"header">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  /** Primär åtgärd (och ev. sekundära) till höger. */
  actions?: React.ReactNode;
};

/** Överst i varje vy: brödsmulor, h1, en mening om vyn, åtgärder till höger. */
export function PageHeader({ title, description, breadcrumbs, actions, className, ...props }: PageHeaderProps) {
  return (
    <header className={cn("mb-6", className)} {...props}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Brödsmulor" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={index} className="flex items-center gap-1">
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="rounded-md transition-colors duration-150 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={isLast ? "page" : undefined} className={cn(isLast && "text-neutral-700")}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast ? <ChevronRight aria-hidden className="size-3.5 text-neutral-400" /> : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-64">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          {description ? <p className="mt-1 text-sm text-neutral-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
