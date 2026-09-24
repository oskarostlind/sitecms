"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export type SwitchProps = Omit<React.ComponentProps<"button">, "onChange" | "value" | "defaultValue"> & {
  /** Kontrollerat läge. */
  checked?: boolean;
  /** Startläge när komponenten är okontrollerad. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Om satt renderas en dold `<input>` så värdet följer med i formulär ("on" / tomt). */
  name?: string;
  /** Värdet som skickas när switchen är på (default "on"). */
  value?: string;
  size?: "sm" | "md";
};

const track = {
  sm: "h-5 w-9",
  md: "h-6 w-11",
};
const thumb = {
  sm: "size-4 data-[state=checked]:translate-x-4",
  md: "size-5 data-[state=checked]:translate-x-5",
};

/** Av/på-reglage (`role="switch"`). Fungerar både kontrollerat och okontrollerat. */
export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  name,
  value = "on",
  size = "md",
  disabled,
  className,
  onClick,
  ...props
}: SwitchProps) {
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  const state = on ? "checked" : "unchecked";

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        data-state={state}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          const next = !on;
          if (!isControlled) setInternal(next);
          onCheckedChange?.(next);
        }}
        className={cn(
          "relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          on ? "bg-brand-600" : "bg-neutral-300",
          track[size],
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          data-state={state}
          className={cn(
            "pointer-events-none block translate-x-0 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150",
            thumb[size],
          )}
        />
      </button>
      {name ? <input type="hidden" name={name} value={on ? value : ""} disabled={disabled} /> : null}
    </>
  );
}
