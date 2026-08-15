"use client";

type ConfirmButtonProps = {
  confirmText: string;
  children: React.ReactNode;
  className?: string;
};

/**
 * A submit button that asks for confirmation before letting the surrounding
 * <form> (typically bound to a delete server action) actually submit.
 */
export function ConfirmButton({ confirmText, children, className }: ConfirmButtonProps) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
