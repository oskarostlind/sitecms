import { CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; icon: string; Icon: LucideIcon }> = {
  info: { box: "border-brand-200 bg-brand-50 text-brand-900", icon: "text-brand-600", Icon: Info },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "text-emerald-600", Icon: CircleCheck },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-800", icon: "text-amber-600", Icon: TriangleAlert },
  danger: { box: "border-red-200 bg-red-50 text-red-800", icon: "text-red-600", Icon: CircleX },
};

export type AlertProps = Omit<React.ComponentProps<"div">, "title"> & {
  tone?: AlertTone;
  title?: React.ReactNode;
  /** Ersätt standardikonen, eller `null` för ingen ikon. */
  icon?: React.ReactNode;
  /** Knappar/länkar under texten. */
  actions?: React.ReactNode;
};

/** Informationsruta. `tone="danger"` får `role="alert"`, övriga `role="status"`. */
export function Alert({ tone = "info", title, icon, actions, className, children, role, ...props }: AlertProps) {
  const { box, icon: iconClass, Icon } = tones[tone];
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}
      {...props}
    >
      {icon === null ? null : (
        <span aria-hidden className={cn("mt-0.5 shrink-0 [&>svg]:size-4", iconClass)}>
          {icon ?? <Icon className="size-4" />}
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="leading-relaxed opacity-90">{children}</div> : null}
        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>
    </div>
  );
}
