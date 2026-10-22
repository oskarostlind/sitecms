"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Förhandsgranskningens läge per webbläsare (docs/LIVE-PREVIEW.md §6):
 * på/av, Dator/Mobil och "Klicka för att redigera". Ligger i localStorage
 * (try/catch — privat läge och blockerad lagring ska bara ge standardläget)
 * och delas mellan knappen i sidhuvudet och sidredigeraren utan provider.
 */

export type PreviewDevice = "desktop" | "mobile";

export type LivePreviewPrefs = {
  open: boolean;
  device: PreviewDevice;
  overlays: boolean;
};

const STORAGE_KEY = "sitecms:live-preview";
const DEFAULT_PREFS: LivePreviewPrefs = { open: false, device: "desktop", overlays: true };

let current: LivePreviewPrefs | null = null;
const listeners = new Set<() => void>();

function load(): LivePreviewPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<LivePreviewPrefs>;
    return {
      open: parsed.open === true,
      device: parsed.device === "mobile" ? "mobile" : "desktop",
      overlays: parsed.overlays !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function getSnapshot(): LivePreviewPrefs {
  if (!current) current = load();
  return current;
}

function getServerSnapshot(): LivePreviewPrefs {
  return DEFAULT_PREFS;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  function onStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    current = load();
    listener();
  }
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLivePreviewPrefs(patch: Partial<LivePreviewPrefs>) {
  current = { ...getSnapshot(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Lagring avstängd — läget gäller bara den här sidvisningen.
  }
  for (const listener of listeners) listener();
}

export function useLivePreviewPrefs(): [LivePreviewPrefs, (patch: Partial<LivePreviewPrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const update = useCallback((patch: Partial<LivePreviewPrefs>) => setLivePreviewPrefs(patch), []);
  return [prefs, update];
}
