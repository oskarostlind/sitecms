"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, CircleX, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "success" | "warning" | "danger" | "info";

export type ToastOptions = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Default "success". */
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
  /** Millisekunder innan toasten stängs. Default 5000 (8000 för `danger`). `Infinity` = stäng aldrig själv. */
  duration?: number;
};

type ToastItem = ToastOptions & { id: string };

type ToastContextValue = {
  /** Visar en toast och returnerar dess id. */
  toast: (options: ToastOptions) => string;
  /** Stänger en toast, eller alla om inget id anges. */
  dismiss: (id?: string) => void;
};

type ToastStateValue = { toasts: ToastItem[]; dismiss: (id?: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const ToastStateContext = createContext<ToastStateValue | null>(null);

const MAX_VISIBLE = 3;
let counter = 0;

export function ToastProvider({
  children,
  viewport = true,
}: {
  children: React.ReactNode;
  /** Rendera `ToastViewport` automatiskt (default true). Sätt false om du placerar den själv. */
  viewport?: boolean;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id?: string) => {
    setToasts((current) => (id === undefined ? [] : current.filter((t) => t.id !== id)));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    counter += 1;
    const id = `toast-${Date.now().toString(36)}-${counter}`;
    // Nyaste sist; äldsta försvinner när fler än MAX_VISIBLE visas.
    const item: ToastItem = { tone: "success", ...options, id };
    setToasts((current) => [...current, item].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);
  const state = useMemo(() => ({ toasts, dismiss }), [toasts, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      <ToastStateContext.Provider value={state}>
        {children}
        {viewport ? <ToastViewport /> : null}
      </ToastStateContext.Provider>
    </ToastContext.Provider>
  );
}

/** `const { toast, dismiss } = useToast();` – kräver `ToastProvider` högre upp i trädet. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast() måste användas inuti <ToastProvider>. Lägg ToastProvider i AdminShell (eller runt komponenten).",
    );
  }
  return ctx;
}

const toneStyles: Record<ToastTone, { icon: string; Icon: LucideIcon | null }> = {
  neutral: { icon: "", Icon: null },
  success: { icon: "text-emerald-600", Icon: CircleCheck },
  info: { icon: "text-brand-600", Icon: Info },
  warning: { icon: "text-amber-600", Icon: TriangleAlert },
  danger: { icon: "text-red-600", Icon: CircleX },
};

/** Området i nedre högra hörnet där toasts visas. Renderas av `ToastProvider` som standard. */
export function ToastViewport({ className }: { className?: string }) {
  const state = useContext(ToastStateContext);
  if (!state) throw new Error("ToastViewport måste ligga inuti <ToastProvider>.");
  const { toasts, dismiss } = state;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Aviseringar"
      className={cn(
        "pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96",
        className,
      )}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}

function ToastCard({ toast, dismiss }: { toast: ToastItem; dismiss: (id?: string) => void }) {
  const { id, title, description, tone = "success", action, duration } = toast;
  const onDismiss = () => dismiss(id);
  const ms = duration ?? (tone === "danger" ? 8000 : 5000);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(ms);
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused || !Number.isFinite(remaining.current)) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => dismiss(id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, id, dismiss]);

  const { icon: iconClass, Icon } = toneStyles[tone];

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full animate-slide-up-fade items-start gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-lg"
    >
      {Icon ? <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", iconClass)} /> : null}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-neutral-900">{title}</p>
        {description ? <p className="mt-0.5 text-neutral-600">{description}</p> : null}
        {action ? (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className="mt-2 rounded-md text-sm font-medium text-brand-600 underline-offset-2 hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Stäng avisering"
        className="-m-1 rounded-md p-1 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
