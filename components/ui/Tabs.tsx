"use client";

import { createContext, useContext, useId, useState } from "react";
import { cn } from "@/lib/cn";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> måste ligga inuti <Tabs>.`);
  return ctx;
}

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export type TabsProps = Omit<React.ComponentProps<"div">, "defaultValue" | "onChange"> & {
  /** Aktiv flik (kontrollerat). */
  value?: string;
  /** Startflik när `value` inte anges. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

/**
 * ```tsx
 * <Tabs value={tab} onValueChange={setTab}>
 *   <TabList aria-label="Inställningar">
 *     <Tab value="general">Allmänt</Tab>
 *     <Tab value="seo">SEO</Tab>
 *   </TabList>
 *   <TabPanel value="general">…</TabPanel>
 *   <TabPanel value="seo">…</TabPanel>
 * </Tabs>
 * ```
 */
export function Tabs({ value, defaultValue = "", onValueChange, className, ...props }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value ?? internal;
  const setValue = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  return (
    <TabsContext.Provider value={{ value: current, setValue, baseId }}>
      <div className={className} {...props} />
    </TabsContext.Provider>
  );
}

export function TabList({ className, onKeyDown, ...props }: React.ComponentProps<"div">) {
  useTabs("TabList");

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
    );
    if (tabs.length === 0) return;
    const index = tabs.findIndex((tab) => tab === document.activeElement);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;

    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  }

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn("flex gap-1 overflow-x-auto border-b border-neutral-200", className)}
      {...props}
    />
  );
}

export type TabProps = Omit<React.ComponentProps<"button">, "value"> & { value: string };

export function Tab({ value, className, onClick, ...props }: TabProps) {
  const ctx = useTabs("Tab");
  const selected = ctx.value === value;
  const id = `${ctx.baseId}-tab-${safeId(value)}`;
  const panelId = `${ctx.baseId}-panel-${safeId(value)}`;
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      data-state={selected ? "active" : "inactive"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setValue(value);
      }}
      className={cn(
        "-mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md border-b-2 px-3 text-sm font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        selected
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-800",
        className,
      )}
      {...props}
    />
  );
}

export type TabPanelProps = Omit<React.ComponentProps<"div">, "value"> & {
  value: string;
  /** Behåll panelen i DOM:en (dold) när den inte är aktiv – bra för formulär. */
  keepMounted?: boolean;
};

export function TabPanel({ value, keepMounted, className, ...props }: TabPanelProps) {
  const ctx = useTabs("TabPanel");
  const selected = ctx.value === value;
  if (!selected && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={`${ctx.baseId}-panel-${safeId(value)}`}
      aria-labelledby={`${ctx.baseId}-tab-${safeId(value)}`}
      hidden={!selected}
      tabIndex={0}
      className={cn("pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 rounded-md", className)}
      {...props}
    />
  );
}
