"use client";

import { useEffect, useRef } from "react";

/**
 * Textarea som växer med innehållet i stället för att scrolla internt.
 * Enkel och förutsägbar — inget beroende av externa bibliotek.
 */
export default function AutoTextarea({
  value,
  onChange,
  minRows = 3,
  className = "",
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  className?: string;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "rows"
>) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
      }}
      rows={minRows}
      className={`w-full resize-none overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-300 ${className}`}
      {...rest}
    />
  );
}
