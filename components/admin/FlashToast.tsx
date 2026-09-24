"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast, type ToastOptions } from "@/components/ui";

type FlashKey = "saved" | "deleted" | "created";

const DEFAULT_MESSAGES: Record<FlashKey, ToastOptions> = {
  saved: { title: "Sparat", description: "Ändringarna syns på sajten inom kort." },
  deleted: { title: "Borttaget" },
  created: { title: "Tillagt" },
};

export type FlashToastProps = {
  /** Byt ut standardtexterna per parameter, t.ex. `{ saved: { title: "Tjänsten sparades" } }`. */
  messages?: Partial<Record<FlashKey, ToastOptions>>;
};

/**
 * Visar en toast när sidan laddas med `?saved=1`, `?deleted=1` eller
 * `?created=1` (satt av en server action som redirectar), och tar sedan bort
 * parametern ur adressen så att toasten inte visas igen vid omladdning.
 *
 * Använder `useSearchParams()` – lägg den inom en `<Suspense>` på statiska sidor.
 */
export function FlashToast({ messages }: FlashToastProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const keys = (Object.keys(DEFAULT_MESSAGES) as FlashKey[]).filter((key) => searchParams.has(key));
    if (keys.length === 0) return;

    // Skydda mot dubbelkörning (StrictMode) för samma adress.
    const signature = `${pathname}?${searchParams.toString()}`;
    if (handled.current === signature) return;
    handled.current = signature;

    for (const key of keys) {
      toast({ ...DEFAULT_MESSAGES[key], ...messages?.[key] });
    }

    const rest = new URLSearchParams(searchParams.toString());
    for (const key of keys) rest.delete(key);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, toast, messages]);

  return null;
}
