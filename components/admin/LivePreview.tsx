"use client";

import Link from "next/link";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import {
  CircleAlert,
  ExternalLink,
  Globe,
  Monitor,
  MousePointerClick,
  RotateCw,
  Settings,
  Smartphone,
  X,
} from "lucide-react";
import { endPreviewSession, setPreviewOverrides, startPreviewSession } from "@/lib/actions/preview";
import {
  panelEnvelope,
  parseSiteMessage,
  previewStartUrl,
  type PanelMessage,
} from "@/lib/preview-protocol";
import { Button, ButtonLink, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { PreviewDevice } from "@/components/admin/live-preview-prefs";

/**
 * Live-förhandsgranskning i sidredigeraren (docs/LIVE-PREVIEW.md §1, §5, §6).
 *
 * Visar kundens riktiga sajt i en iframe och håller den i takt med fälten:
 *   - `patch()` byter text/bild direkt i sajtens DOM medan man skriver,
 *   - osparade värden skickas (debounce 400 ms) till sessionen med
 *     setPreviewOverrides och sajten ombeds rendera om ("refresh"),
 *   - klick på ett markerat element i sajten ger "focus" → onFocusField,
 *   - fokus på ett fält i editorn ger "highlight" i sajten.
 *
 * Komponenten äger sessionen (start/förnyelse/avslut), iframen och
 * verktygsraden. Vad som är osparat vet bara PageBlockEditor — den lämnar
 * `getUnsaved()` och en nyckel som ändras när mängden ändras.
 */

export type PreviewUpdate = { blockId: string; value: string; alt?: string | null };

export type FocusFieldResult =
  | { status: "focused" }
  | { status: "other-page"; title: string; href: string }
  | { status: "missing" };

export type LivePreviewHandle = {
  /** Direkt DOM-byte på sajten (text- och bildfält). */
  patch(field: { key: string; kind: "text" | "image"; value: string; alt?: string | null }): void;
  /** Scrolla till och blinka fältet på sajten. */
  highlight(key: string): void;
  /** Skicka osparade värden nu (utan debounce) och rendera om — t.ex. efter Spara/Ångra. */
  syncNow(): void;
};

type LivePreviewProps = {
  siteId: string;
  pageSlug: string;
  initialPath: string;
  isOwner: boolean;
  getUnsaved: () => PreviewUpdate[];
  /** Ändras när mängden osparade värden ändras (t.ex. JSON av dem). */
  unsavedKey: string;
  onFocusField: (page: string, key: string) => FocusFieldResult;
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  overlays: boolean;
  onOverlaysChange: (enabled: boolean) => void;
  onClose: () => void;
};

type Connection = "starting" | "connecting" | "ready" | "timeout" | "no-url" | "error";
type SyncState = "idle" | "updating" | "error";

const DEBOUNCE_MS = 400;
const READY_TIMEOUT_MS = 10_000;
/** Om sajten inte svarar "refreshed" räknas uppdateringen som klar efter så här lång tid. */
const REFRESH_FALLBACK_MS = 8_000;
const NOTICE_MS = 6_000;

/** Origins som iframen får ha: bas-URL:ens och dess www-/icke-www-tvilling. */
function allowedOriginsFor(baseUrl: string): Set<string> {
  const origins = new Set<string>();
  try {
    const url = new URL(baseUrl);
    origins.add(url.origin);
    const host = url.hostname;
    const twin = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    if (host.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const twinUrl = new URL(url.origin);
      twinUrl.hostname = twin;
      origins.add(twinUrl.origin);
    }
  } catch {
    // ogiltig bas-URL — inga origins
  }
  return origins;
}

function displayHost(baseUrl: string | null): string {
  if (!baseUrl) return "";
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

const LivePreview = forwardRef<LivePreviewHandle, LivePreviewProps>(function LivePreview(
  {
    siteId,
    pageSlug,
    initialPath,
    isOwner,
    getUnsaved,
    unsavedKey,
    onFocusField,
    device,
    onDeviceChange,
    overlays,
    onOverlaysChange,
    onClose,
  },
  ref,
) {
  const [connection, setConnection] = useState<Connection>("starting");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [path, setPath] = useState(initialPath);
  const [helpDismissed, setHelpDismissed] = useState(false);
  const [notice, setNotice] = useState<FocusFieldResult | null>(null);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const tokenRef = useRef<string | null>(null);
  const baseUrlRef = useRef<string | null>(null);
  const allowedOrigins = useRef<Set<string>>(new Set());
  /** Origin från senaste "ready" — dit postas allt. */
  const frameOrigin = useRef<string | null>(null);
  const pathRef = useRef(initialPath);
  const overlaysRef = useRef(overlays);

  // Synk-motorn
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const queued = useRef<{ force: boolean } | null>(null);
  const awaitingRefresh = useRef(false);
  const lastSynced = useRef<string>("[]");
  const restarting = useRef(false);
  const mounted = useRef(true);

  // Senaste callbacks utan att starta om effekter.
  const getUnsavedRef = useRef(getUnsaved);
  const onFocusFieldRef = useRef(onFocusField);
  useLayoutEffect(() => {
    getUnsavedRef.current = getUnsaved;
    onFocusFieldRef.current = onFocusField;
    overlaysRef.current = overlays;
  });

  const post = useCallback((message: PanelMessage) => {
    const target = iframeRef.current?.contentWindow;
    const origin = frameOrigin.current;
    if (!target || !origin) return false;
    target.postMessage(panelEnvelope(message), origin);
    return true;
  }, []);

  const settleIfIdle = useCallback(() => {
    if (!inFlight.current && !queued.current && !debounceTimer.current && !awaitingRefresh.current) {
      setSyncState((state) => (state === "error" ? state : "idle"));
    }
  }, []);

  const requestRefresh = useCallback(() => {
    if (!post({ type: "refresh" })) {
      awaitingRefresh.current = false;
      settleIfIdle();
      return;
    }
    awaitingRefresh.current = true;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      awaitingRefresh.current = false;
      settleIfIdle();
    }, REFRESH_FALLBACK_MS);
  }, [post, settleIfIdle]);

  // ---------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------

  const loadFrame = useCallback((targetPath: string) => {
    const token = tokenRef.current;
    const base = baseUrlRef.current;
    if (!token || !base) return;
    frameOrigin.current = null;
    setConnection("connecting");
    setHelpDismissed(false);
    setFrameSrc(previewStartUrl(base, token, targetPath));
    setFrameKey((key) => key + 1);
    if (readyTimer.current) clearTimeout(readyTimer.current);
    readyTimer.current = setTimeout(() => {
      readyTimer.current = null;
      setConnection((state) => (state === "connecting" ? "timeout" : state));
    }, READY_TIMEOUT_MS);
  }, []);

  /** Startar (eller förnyar) sessionen och laddar iframen med de osparade värdena redan på plats. */
  const openSession = useCallback(
    async (targetPath: string) => {
      setConnection("starting");
      setErrorText(null);
      const result = await startPreviewSession(siteId);
      if (!mounted.current) {
        if (result.ok) void endPreviewSession(siteId, result.token);
        return;
      }
      if (!result.ok) {
        setConnection("error");
        setErrorText(result.error);
        return;
      }
      const previous = tokenRef.current;
      tokenRef.current = result.token;
      if (previous && previous !== result.token) void endPreviewSession(siteId, previous);

      if (!result.previewBaseUrl) {
        baseUrlRef.current = null;
        setBaseUrl(null);
        setConnection("no-url");
        return;
      }
      baseUrlRef.current = result.previewBaseUrl;
      allowedOrigins.current = allowedOriginsFor(result.previewBaseUrl);
      setBaseUrl(result.previewBaseUrl);

      const unsaved = getUnsavedRef.current();
      const json = JSON.stringify(unsaved);
      if (unsaved.length > 0) {
        const synced = await setPreviewOverrides(siteId, result.token, unsaved);
        if (!mounted.current) return;
        if (synced.ok) lastSynced.current = json;
      } else {
        lastSynced.current = json;
      }
      loadFrame(targetPath);
    },
    [siteId, loadFrame],
  );

  useEffect(() => {
    mounted.current = true;
    void openSession(initialPath);
    return () => {
      mounted.current = false;
      const token = tokenRef.current;
      tokenRef.current = null;
      if (token) void endPreviewSession(siteId, token);
      for (const timer of [debounceTimer, refreshTimer, readyTimer, noticeTimer]) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
      }
    };
    // initialPath/openSession ändras inte under komponentens livstid; ett nytt försök går via sessionAttempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, sessionAttempt]);

  // ---------------------------------------------------------------------
  // Synk av osparade värden
  // ---------------------------------------------------------------------

  const runSync = useCallback(
    async (force: boolean) => {
      if (inFlight.current || restarting.current) {
        queued.current = { force: force || Boolean(queued.current?.force) };
        return;
      }
      const token = tokenRef.current;
      if (!token || !baseUrlRef.current) return;

      const unsaved = getUnsavedRef.current();
      const json = JSON.stringify(unsaved);
      if (!force && json === lastSynced.current) {
        settleIfIdle();
        return;
      }

      inFlight.current = true;
      setSyncState("updating");
      const result = await setPreviewOverrides(siteId, token, unsaved);
      inFlight.current = false;
      if (!mounted.current) return;

      if (!result.ok) {
        if (result.code === "expired" && !restarting.current) {
          // Sessionen har gått ut (2 h utan ändringar) — starta en ny och ladda om på samma sökväg.
          restarting.current = true;
          queued.current = null;
          await openSession(pathRef.current);
          restarting.current = false;
          setSyncState("idle");
          return;
        }
        setSyncState("error");
        setErrorText(result.error);
      } else {
        lastSynced.current = json;
        setErrorText(null);
        requestRefresh();
      }

      const next = queued.current;
      queued.current = null;
      if (next) void runSync(next.force);
      else settleIfIdle();
    },
    [siteId, openSession, requestRefresh, settleIfIdle],
  );

  // Ny mängd osparade värden → debounce → setPreviewOverrides → refresh.
  const firstKey = useRef(true);
  useEffect(() => {
    if (firstKey.current) {
      firstKey.current = false;
      return;
    }
    if (!tokenRef.current || !baseUrlRef.current) return;
    setSyncState("updating");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      debounceTimer.current = null;
      void runSync(false);
    }, DEBOUNCE_MS);
  }, [unsavedKey, runSync]);

  useImperativeHandle(
    ref,
    () => ({
      patch(field) {
        post({
          type: "patch",
          page: pageSlug,
          key: field.key,
          kind: field.kind,
          value: field.value,
          ...(field.kind === "image" ? { alt: field.alt ?? null } : {}),
        });
      },
      highlight(key) {
        post({ type: "highlight", page: pageSlug, key });
      },
      syncNow() {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
        void runSync(true);
      },
    }),
    [pageSlug, post, runSync],
  );

  // ---------------------------------------------------------------------
  // Meddelanden från sajten
  // ---------------------------------------------------------------------

  const showNotice = useCallback((result: FocusFieldResult) => {
    setNotice(result);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (!allowedOrigins.current.has(event.origin)) return;
      const message = parseSiteMessage(event.data);
      if (!message) return;

      if (message.type === "ready") {
        frameOrigin.current = event.origin;
        pathRef.current = message.path;
        setPath(message.path);
        if (readyTimer.current) clearTimeout(readyTimer.current);
        readyTimer.current = null;
        setConnection("ready");
        post({ type: "overlays", enabled: overlaysRef.current });
        // Ändringar som hann komma medan sajten laddade.
        if (JSON.stringify(getUnsavedRef.current()) !== lastSynced.current) void runSync(false);
        return;
      }
      if (message.type === "refreshed") {
        if (frameOrigin.current !== event.origin) return;
        pathRef.current = message.path;
        setPath(message.path);
        awaitingRefresh.current = false;
        if (refreshTimer.current) clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
        settleIfIdle();
        return;
      }
      if (message.type === "focus") {
        if (frameOrigin.current !== event.origin) return;
        const result = onFocusFieldRef.current(message.page, message.key);
        if (result.status === "focused") setNotice(null);
        else showNotice(result);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [post, runSync, settleIfIdle, showNotice]);

  // "Klicka för att redigera" av/på.
  useEffect(() => {
    post({ type: "overlays", enabled: overlays });
  }, [overlays, post]);

  // ---------------------------------------------------------------------
  // Verktygsrad
  // ---------------------------------------------------------------------

  function reload() {
    if (connection === "error" || connection === "no-url") {
      setSessionAttempt((n) => n + 1);
      return;
    }
    loadFrame(pathRef.current);
  }

  const openUrl = baseUrl && tokenRef.current ? previewStartUrl(baseUrl, tokenRef.current, path) : null;
  const loading = connection === "starting" || connection === "connecting";
  const status = (() => {
    if (connection === "starting" || connection === "connecting") return { tone: "muted", label: "Ansluter…", spin: true } as const;
    if (connection === "timeout") return { tone: "warning", label: "Sajten svarar inte" } as const;
    if (connection === "no-url") return { tone: "warning", label: "Adress saknas" } as const;
    if (connection === "error") return { tone: "danger", label: "Kunde inte starta" } as const;
    if (syncState === "updating") return { tone: "muted", label: "Uppdaterar…", spin: true } as const;
    if (syncState === "error") return { tone: "danger", label: "Kunde inte uppdatera" } as const;
    return { tone: "success", label: "Uppdaterad" } as const;
  })();

  const showHelp = connection === "timeout" && !helpDismissed;

  return (
    <div className="@container flex h-full min-h-0 flex-col bg-neutral-100">
      {/* Verktygsrad */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-2 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-live="polite"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium",
              status.tone === "success" && "text-emerald-700",
              status.tone === "muted" && "text-neutral-500",
              status.tone === "warning" && "bg-amber-50 text-amber-800",
              status.tone === "danger" && "bg-red-50 text-red-700",
            )}
          >
            {"spin" in status && status.spin ? (
              <Spinner className="size-3.5" />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  status.tone === "success" && "bg-emerald-500",
                  status.tone === "warning" && "bg-amber-500",
                  status.tone === "danger" && "bg-red-500",
                )}
              />
            )}
            <span className="sr-only @[34rem]:not-sr-only">{status.label}</span>
          </span>
          <div
            className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md bg-neutral-100 px-2.5 text-xs text-neutral-600"
            title={baseUrl ? `${displayHost(baseUrl)}${path}` : undefined}
          >
            <Globe aria-hidden className="size-3.5 shrink-0 text-neutral-400" />
            <span className="sr-only">Sökväg: </span>
            <span className="hidden shrink-0 text-neutral-400 @[44rem]:inline">{displayHost(baseUrl)}</span>
            <span className="truncate font-mono text-neutral-800">{path}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div role="group" aria-label="Skärmstorlek" className="hidden items-center rounded-lg bg-neutral-100 p-0.5 @[26rem]:flex">
            <SegmentButton active={device === "desktop"} onClick={() => onDeviceChange("desktop")} label="Dator" icon={<Monitor />} />
            <SegmentButton active={device === "mobile"} onClick={() => onDeviceChange("mobile")} label="Mobil" icon={<Smartphone />} />
          </div>
          <ToolButton
            label="Klicka för att redigera"
            pressed={overlays}
            onClick={() => onOverlaysChange(!overlays)}
            icon={<MousePointerClick />}
            showLabel="@[52rem]:not-sr-only"
          />
          <ToolButton label="Ladda om" onClick={reload} icon={<RotateCw />} />
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Öppna förhandsgranskningen i ny flik"
              title="Öppna i ny flik"
              className={toolButtonClass(false)}
            >
              <ExternalLink aria-hidden className="size-4" />
            </a>
          ) : null}
          <span aria-hidden className="mx-0.5 h-5 w-px bg-neutral-200" />
          <ToolButton label="Stäng förhandsgranskningen" onClick={onClose} icon={<X />} />
        </div>
      </div>

      {/* Sajten */}
      <div className="relative min-h-0 flex-1">
        {loading || syncState === "updating" ? (
          <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-brand-100">
            <div className="live-preview-progress h-full w-1/3 bg-brand-500" />
          </div>
        ) : null}

        <div className={cn("absolute inset-0 flex justify-center", device === "mobile" && "px-3 py-4 sm:px-6 sm:py-6")}>
          {frameSrc ? (
            <iframe
              key={frameKey}
              ref={iframeRef}
              src={frameSrc}
              title="Förhandsgranskning av sajten"
              className={cn(
                "h-full bg-white transition-opacity duration-300",
                device === "mobile"
                  ? "w-[390px] max-w-full rounded-2xl border border-neutral-300 shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)]"
                  : "w-full",
                connection === "connecting" ? "opacity-60" : "opacity-100",
              )}
            />
          ) : null}
        </div>

        {connection === "starting" || (connection === "connecting" && !frameSrc) ? (
          <CenterCard>
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <Spinner /> Startar förhandsgranskningen…
            </div>
          </CenterCard>
        ) : null}

        {connection === "no-url" ? (
          <CenterCard>
            <PanelCard
              icon={<Settings />}
              title="Ange sajtens adress"
              actions={
                isOwner ? (
                  <ButtonLink href={`/admin/sites/${siteId}/installningar#previewUrl`} size="sm">
                    Gå till Inställningar
                  </ButtonLink>
                ) : null
              }
            >
              {isOwner ? (
                <p>
                  Förhandsgranskningen behöver veta var sajten finns. Fyll i <strong>Adress för förhandsgranskning</strong>{" "}
                  (eller sajtens domän) under Inställningar.
                </p>
              ) : (
                <p>
                  Förhandsgranskningen behöver veta var sajten finns. Be sajtens ägare att fylla i{" "}
                  <strong>Adress för förhandsgranskning</strong> under Inställningar.
                </p>
              )}
            </PanelCard>
          </CenterCard>
        ) : null}

        {connection === "error" ? (
          <CenterCard>
            <PanelCard
              tone="danger"
              icon={<CircleAlert />}
              title="Förhandsgranskningen kunde inte starta"
              actions={
                <Button size="sm" variant="secondary" icon={<RotateCw />} onClick={reload}>
                  Försök igen
                </Button>
              }
            >
              <p>{errorText ?? "Något gick fel. Försök igen."}</p>
            </PanelCard>
          </CenterCard>
        ) : null}

        {showHelp ? (
          <CenterCard dim>
            <PanelCard
              tone="warning"
              icon={<CircleAlert />}
              title="Sajten svarar inte på förhandsgranskning"
              actions={
                <>
                  <Button size="sm" variant="secondary" icon={<RotateCw />} onClick={reload}>
                    Försök igen
                  </Button>
                  <ButtonLink href="/docs#forhandsgranskning" target="_blank" rel="noopener noreferrer" size="sm" variant="ghost">
                    Instruktionen <ExternalLink aria-hidden className="size-3.5" />
                    <span className="sr-only">(öppnas i ny flik)</span>
                  </ButtonLink>
                  <Button size="sm" variant="ghost" onClick={() => setHelpDismissed(true)}>
                    Visa sajten ändå
                  </Button>
                </>
              }
            >
              <p>
                {displayHost(baseUrl) ? (
                  <>
                    <span className="font-mono text-[13px]">{displayHost(baseUrl)}</span> har inte kopplat på
                    förhandsgranskningen ännu.{" "}
                  </>
                ) : null}
                {isOwner ? "Det här behöver finnas på sajten:" : "Be den som byggt sajten att lägga till:"}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-mono text-[13px]">sitecms-next</span> 0.4 eller senare
                </li>
                <li>
                  Routen <span className="font-mono text-[13px] break-all">app/api/sitecms/preview/route.ts</span>
                </li>
                <li>
                  <span className="font-mono text-[13px]">&lt;SitecmsPreview /&gt;</span> sist i layoutens body
                </li>
                <li>
                  <span className="font-mono text-[13px]">previewFrameHeaders()</span> i next.config och ingen{" "}
                  <span className="font-mono text-[13px]">X-Frame-Options</span>
                </li>
              </ul>
            </PanelCard>
          </CenterCard>
        ) : null}

        {notice && notice.status !== "focused" ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
            <div
              role="status"
              className="pointer-events-auto flex max-w-md items-start gap-3 rounded-lg border border-neutral-200 bg-white/95 px-3.5 py-2.5 text-sm text-neutral-700 shadow-lg backdrop-blur animate-slide-up-fade"
            >
              <span className="min-w-0 flex-1">
                {notice.status === "other-page" ? (
                  <>
                    Fältet finns på sidan <strong className="font-medium text-neutral-900">{notice.title}</strong>.{" "}
                    <Link
                      href={notice.href}
                      className="font-medium text-brand-700 underline-offset-2 hover:text-brand-800 hover:underline"
                    >
                      Öppna sidan
                    </Link>
                  </>
                ) : (
                  "Det här fältet finns inte på den här sidan."
                )}
              </span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Stäng meddelandet"
                className="-mr-1 rounded-md p-0.5 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
});

export default LivePreview;

// ---------------------------------------------------------------------------
// Små delar
// ---------------------------------------------------------------------------

function toolButtonClass(pressed: boolean) {
  return cn(
    "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
    pressed ? "bg-brand-50 text-brand-800 hover:bg-brand-100" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
  );
}

function ToolButton({
  label,
  icon,
  onClick,
  pressed,
  showLabel,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  pressed?: boolean;
  /** Container-variant där etiketten blir synlig, t.ex. "@[52rem]:not-sr-only". */
  showLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={showLabel ? undefined : label}
      title={label}
      className={toolButtonClass(Boolean(pressed))}
    >
      <span aria-hidden className="inline-flex [&>svg]:size-4">
        {icon}
      </span>
      {showLabel ? (
        <span className={cn("sr-only whitespace-nowrap text-[13px] font-medium", showLabel)}>{label}</span>
      ) : null}
    </button>
  );
}

function SegmentButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
        active ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800",
      )}
    >
      <span aria-hidden className="inline-flex [&>svg]:size-4">
        {icon}
      </span>
      <span className="sr-only @[40rem]:not-sr-only">{label}</span>
    </button>
  );
}

function CenterCard({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center overflow-y-auto p-4",
        dim ? "bg-neutral-100/80 backdrop-blur-[2px]" : "bg-neutral-100",
      )}
    >
      {children}
    </div>
  );
}

function PanelCard({
  icon,
  title,
  tone = "neutral",
  actions,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "neutral" | "warning" | "danger";
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-sm animate-slide-up-fade">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-[18px]",
            tone === "warning" && "bg-amber-50 text-amber-600",
            tone === "danger" && "bg-red-50 text-red-600",
            tone === "neutral" && "bg-neutral-100 text-neutral-600",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
          <div className="mt-1.5 text-sm leading-relaxed text-neutral-600">{children}</div>
          {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
