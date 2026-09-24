import { cn } from "@/lib/cn";

export type SpinnerProps = React.ComponentProps<"svg"> & {
  /** Storlek i px (default 16). */
  size?: number;
  /** Skärmläsartext. Utelämna när spinnern står bredvid synlig text. */
  label?: string;
};

/** 16px SVG-snurra som ärver textfärgen (`currentColor`). */
export function Spinner({ size = 16, label, className, ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      width={size}
      height={size}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21.5 12a9.5 9.5 0 0 0-9.5-9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
