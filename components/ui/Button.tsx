import Link from "next/link";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Endast för `variant="danger"`: fylld röd knapp (bekräftelsedialoger). */
  solid?: boolean;
  className?: string;
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const variants: Record<Exclude<ButtonVariant, "danger">, string> = {
  primary:
    "bg-brand-400 text-brand-950 shadow-[0_8px_24px_-10px_rgba(47,211,138,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-brand-300 active:bg-brand-500",
  secondary: "border border-neutral-300 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100",
  link: "text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline",
};

const dangerOutline = "border border-red-200 bg-white text-red-700 hover:bg-red-50";
const dangerSolid = "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 rounded-lg px-3 text-sm",
  md: "h-10 rounded-lg px-4 text-sm",
  lg: "h-11 rounded-lg px-5 text-base",
};

const linkSizes: Record<ButtonSize, string> = {
  sm: "rounded-md text-sm",
  md: "rounded-md text-sm",
  lg: "rounded-md text-base",
};

/** Klassnamn för knapputseendet – använd när du behöver stila något annat element som en knapp. */
export function buttonClassName({ variant = "primary", size = "md", solid, className }: ButtonStyleOptions = {}) {
  const variantClass = variant === "danger" ? (solid ? dangerSolid : dangerOutline) : variants[variant];
  const sizeClass = variant === "link" ? linkSizes[size] : sizes[size];
  return cn(base, variantClass, sizeClass, className);
}

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  solid?: boolean;
  /** Ikon (t.ex. lucide) som visas före texten, renderas i 16px. */
  icon?: React.ReactNode;
};

export type ButtonProps = React.ComponentProps<"button"> &
  SharedProps & {
    /** Visar spinner, sätter `disabled` och `aria-busy`. */
    loading?: boolean;
  };

function IconSlot({ children }: { children: React.ReactNode }) {
  return (
    <span aria-hidden className="inline-flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  solid,
  loading = false,
  icon,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, solid, className })}
      {...props}
    >
      {loading ? <Spinner /> : icon ? <IconSlot>{icon}</IconSlot> : null}
      {children}
    </button>
  );
}

export type ButtonLinkProps = React.ComponentProps<typeof Link> & SharedProps;

/** Samma utseende som `Button`, men renderar `next/link`. */
export function ButtonLink({ variant = "primary", size = "md", solid, icon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, solid, className })} {...props}>
      {icon ? <IconSlot>{icon}</IconSlot> : null}
      {children}
    </Link>
  );
}
