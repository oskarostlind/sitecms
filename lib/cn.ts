/**
 * Slår ihop klassnamn och hoppar över falsy-värden.
 * `cn("px-4", isActive && "bg-brand-50", className)`
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
