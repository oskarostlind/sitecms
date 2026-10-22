"use client";
/**
 * Klientdelen av trafikpixeln. Renderas av `<SitecmsAnalytics />`
 * (sitecms-next/analytics) — använd den i stället för att importera den här
 * direkt, så att inget skickas i förhandsgranskningen.
 *
 * Skickar en sidvisning till sajtens egen route (`/api/sitecms/events`) vid
 * mount och vid varje byte av pathname (inte vid hash/query). Inga cookies,
 * ingen localStorage, inget skript från tredje part. Skippar `localhost`,
 * `navigator.webdriver` och dubbletter av samma pathname i rad.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation.js";

export type SitecmsAnalyticsClientProps = {
  /** Sajtens route som tar emot sidvisningar. Default "/api/sitecms/events". */
  endpoint?: string;
};

/** Det klienten skickar till sajtens route. */
export type AnalyticsPayload = { p: string; r?: string; q?: string };

function isLocalHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  return host === "" || host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

/**
 * Ren regel för om en sidvisning ska skickas: pathname måste finnas, inte
 * vara samma som förra, inte komma från localhost och inte från en
 * automatiserad webbläsare (`navigator.webdriver`).
 */
export function shouldTrack(pathname: string | null | undefined, prev: string | null | undefined, hostname: string, webdriver: boolean): boolean {
  if (!pathname) return false;
  if (webdriver) return false;
  if (isLocalHost(hostname)) return false;
  if (prev && prev === pathname) return false;
  return true;
}

/** Querysträngen utan `?`, men bara om den innehåller en utm-parameter (annars tom). */
export function utmQuery(search: string | null | undefined): string {
  const value = (search || "").replace(/^\?/, "");
  return /(^|&)utm_[a-z]+=/i.test(value) ? value.slice(0, 500) : "";
}

function send(endpoint: string, payload: AnalyticsPayload) {
  const body = JSON.stringify(payload);
  try {
    // text/plain: ingen preflight, och routen läser body som text ändå.
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    // Faller tillbaka på fetch nedan.
  }
  try {
    void fetch(endpoint, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "omit",
      headers: { "content-type": "text/plain;charset=UTF-8" },
    }).catch(() => {});
  } catch {
    // Inget att göra — pixeln får aldrig störa sidan.
  }
}

export function SitecmsAnalyticsClient({ endpoint = "/api/sitecms/events" }: SitecmsAnalyticsClientProps) {
  const pathname = usePathname();
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const webdriver = Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver);
    if (!shouldTrack(pathname, prev.current, window.location.hostname, webdriver)) return;
    const first = prev.current === null;
    prev.current = pathname;
    const payload: AnalyticsPayload = { p: pathname! };
    // document.referrer är sidan som ledde hit och gäller bara första
    // visningen; vid navigering inom sajten är referern sajten själv.
    const referrer = first ? document.referrer : "";
    if (referrer) payload.r = referrer.slice(0, 2000);
    const q = utmQuery(window.location.search);
    if (q) payload.q = q;
    send(endpoint, payload);
  }, [pathname, endpoint]);

  return null;
}

export default SitecmsAnalyticsClient;
