"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./Button";

export type SubmitButtonProps = Omit<ButtonProps, "type" | "loading"> & {
  /** Text som visas medan formuläret skickas, t.ex. "Sparar…". Default: barnen. */
  pendingText?: React.ReactNode;
};

/**
 * Submit-knapp för server action-formulär. Måste ligga inuti `<form>`;
 * visar spinner och är låst medan formuläret skickas.
 */
export function SubmitButton({ pendingText, children, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
