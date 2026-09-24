"use client";

import { Button, type ButtonProps } from "@/components/ui";

type ConfirmButtonProps = {
  confirmText: string;
  children: React.ReactNode;
  className?: string;
  /** Knapputseende – default "danger" (röd outline), matchar tidigare beteende. */
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: ButtonProps["icon"];
  "aria-label"?: string;
  title?: string;
};

/**
 * En submit-knapp (ui `Button`) som ber om bekräftelse innan den omgivande
 * `<form>`-en (vanligtvis kopplad till en radera/destruktiv server action)
 * faktiskt skickas.
 */
export function ConfirmButton({
  confirmText,
  children,
  className,
  variant = "danger",
  size,
  icon,
  ...rest
}: ConfirmButtonProps) {
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      icon={icon}
      className={className}
      {...rest}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
