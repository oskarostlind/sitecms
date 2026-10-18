"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui";

export type CopyButtonProps = {
  /** Texten som kopieras. */
  value: string;
  /** Knapptext (default "Kopiera"). */
  label?: string;
  /** Tillgängligt namn, t.ex. "Kopiera lib/sitecms.ts". */
  "aria-label"?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
};

/**
 * Kopierar `value` till urklipp och visar "Kopierat" i två sekunder.
 * Fungerar både i panelen och på publika sidor (ingen ToastProvider krävs).
 * Faller tillbaka på en dold textarea + execCommand där Clipboard API saknas
 * (t.ex. http utan TLS).
 */
export function CopyButton({
  value,
  label = "Kopiera",
  variant = "secondary",
  size = "sm",
  className,
  ...rest
}: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
    }

    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const text = state === "copied" ? "Kopierat" : state === "failed" ? "Kunde inte kopiera" : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      icon={state === "copied" ? <Check /> : <Copy />}
      onClick={copy}
      className={className}
      aria-label={rest["aria-label"]}
    >
      <span aria-live="polite">{text}</span>
    </Button>
  );
}
