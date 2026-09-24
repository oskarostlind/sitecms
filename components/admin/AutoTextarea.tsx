"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { fieldBase, fieldInvalid } from "@/components/ui/fieldStyles";
import { cn } from "@/lib/cn";

type AutoTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
  /** Felutseende + `aria-invalid` (samma som ui `Textarea`). */
  invalid?: boolean;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows">;

/**
 * Textarea som växer med innehållet i stället för att scrolla internt.
 * Enkel och förutsägbar — inget beroende av externa bibliotek.
 * Har samma utseende som `Textarea` i components/ui.
 */
const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(function AutoTextarea(
  { value, onChange, minRows = 3, className, invalid, "aria-invalid": ariaInvalid, ...rest },
  forwardedRef,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLTextAreaElement);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // Ramen (1px upp + 1px ner) räknas inte in i scrollHeight.
    el.style.height = `${el.scrollHeight + 2}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  // Bredden kan ändras (fönster, sidomeny) och därmed antalet rader.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastWidth = el.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth !== lastWidth) {
        lastWidth = el.offsetWidth;
        resize();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      rows={minRows}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(
        fieldBase,
        "resize-none overflow-hidden px-3 py-2 leading-relaxed",
        invalid && fieldInvalid,
        className,
      )}
      {...rest}
    />
  );
});

export default AutoTextarea;
