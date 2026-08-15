"use client";

import { useState } from "react";

type CharCounterFieldProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  limit: number;
  multiline?: boolean;
  placeholder?: string;
};

/**
 * A text input/textarea with a live character counter. Turns red and shows a
 * warning once the value passes `limit` (used for SEO title/description,
 * where Google typically truncates around 60/160 characters).
 */
export function CharCounterField({
  id,
  name,
  label,
  defaultValue = "",
  limit,
  multiline = false,
  placeholder,
}: CharCounterFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const count = value.length;
  const over = count > limit;

  const fieldClassName = [
    "mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none",
    over
      ? "border-red-300 focus:border-red-400"
      : "border-neutral-300 focus:border-neutral-500",
  ].join(" ");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
        <span className={over ? "text-xs font-medium text-red-600" : "text-xs text-neutral-400"}>
          {count}/{limit}
        </span>
      </div>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={fieldClassName}
        />
      ) : (
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={fieldClassName}
        />
      )}
      {over && (
        <p className="mt-1 text-xs text-red-600">
          Texten är längre än rekommenderat ({limit} tecken) och kan klippas av i sökresultat.
        </p>
      )}
    </div>
  );
}
