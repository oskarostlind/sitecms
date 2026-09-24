"use client";

import { useState } from "react";
import { Field, Input, Textarea, fieldIds } from "@/components/ui";

type CharCounterFieldProps = {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  limit: number;
  multiline?: boolean;
  placeholder?: string;
  /** Hjälptext under fältet (ersätts av en varning när texten blir för lång). */
  hint?: React.ReactNode;
  /** Kontrollerat värde – används när föräldern behöver texten (t.ex. live-förhandsvisning). */
  value?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Textfält med live-räknare ("46/60"). Räknaren blir röd och en varning visas
 * när texten passerar `limit` (SEO-titel/-beskrivning, där Google brukar klippa
 * runt 60/160 tecken). Fungerar okontrollerat (`defaultValue`) eller
 * kontrollerat (`value` + `onValueChange`).
 */
export function CharCounterField({
  id,
  name,
  label,
  defaultValue = "",
  limit,
  multiline = false,
  placeholder,
  hint,
  value: controlledValue,
  onValueChange,
}: CharCounterFieldProps) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const count = value.length;
  const over = count > limit;
  const { hintId } = fieldIds(id);

  const handleChange = (next: string) => {
    if (controlledValue === undefined) setInternal(next);
    onValueChange?.(next);
  };

  const hintContent = over ? (
    <span className="text-amber-700">
      Texten är längre än rekommenderat ({limit} tecken) och kan klippas av i sökresultat.
    </span>
  ) : (
    hint
  );

  return (
    <Field htmlFor={id} label={label} hint={hintContent} count={`${count}/${limit}`} countOver={over}>
      {multiline ? (
        <Textarea
          id={id}
          name={name}
          rows={3}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={hintContent ? hintId : undefined}
        />
      ) : (
        <Input
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={placeholder}
          aria-describedby={hintContent ? hintId : undefined}
        />
      )}
    </Field>
  );
}
