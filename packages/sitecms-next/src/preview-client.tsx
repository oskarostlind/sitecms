"use client";
/**
 * Klientdelen av live-förhandsgranskningen. Renderas av `<SitecmsPreview />`
 * (sitecms-next/preview) när draft mode är på — använd den i stället för att
 * importera den här direkt.
 *
 * I en iframe (panelen): pratar med panelen via postMessage (protokoll v1),
 * ritar hover-ramar över `[data-sitecms]` och skickar `focus` vid klick.
 * Utanför iframe: en liten bar "Förhandsgranskning · Avsluta".
 *
 * Tar bara emot meddelanden från `panelOrigin` (och från fönstret som bäddat
 * in sidan) och postar alltid med `targetOrigin = panelOrigin`.
 */
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation.js";

export type SitecmsPreviewClientProps = {
  /** Panelens origin (från cookien sitecms_preview_origin). null → ingen kommunikation. */
  panelOrigin: string | null;
  /** Länk som stänger av förhandsgranskningen. `&path=…` läggs till. */
  exitHref?: string;
};

type Field = { page: string; key: string };

const PART = /^[a-z0-9._-]+$/;
const ATTR = "data-sitecms";
const Z = "2147483646";
const BRAND = "#2450d1";
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function validPart(value: unknown): value is string {
  return typeof value === "string" && value.length <= 200 && PART.test(value);
}

function parseField(value: string | null): Field | null {
  if (!value) return null;
  const i = value.indexOf(":");
  if (i < 0) return null;
  const page = value.slice(0, i);
  const key = value.slice(i + 1);
  return validPart(page) && validPart(key) ? { page, key } : null;
}

function elementsFor(page: string, key: string): HTMLElement[] {
  // page och key är validerade (a–z0–9._-), så selektorn behöver ingen escaping.
  return Array.from(document.querySelectorAll<HTMLElement>(`[${ATTR}="${page}:${key}"]`));
}

function collectFields(): Field[] {
  const seen = new Set<string>();
  const fields: Field[] = [];
  for (const el of Array.from(document.querySelectorAll(`[${ATTR}]`))) {
    const field = parseField(el.getAttribute(ATTR));
    if (!field) continue;
    const id = `${field.page}:${field.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    fields.push(field);
  }
  return fields;
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Direkt DOM-byte (patch)
// ---------------------------------------------------------------------------

/** Textnoder som patch skapat i tomma element; tas bort när React renderat egna. */
const createdTextNodes = new Set<Text>();

function patchText(el: HTMLElement, value: string) {
  if (el.children.length > 0) return; // bara element utan barnelement
  // Byt nodeValue på befintliga textnoder i stället för textContent, så att
  // React behåller sina referenser och nästa refresh uppdaterar samma noder.
  const texts = Array.from(el.childNodes).filter((n): n is Text => n.nodeType === Node.TEXT_NODE);
  if (texts.length === 0) {
    const node = document.createTextNode(value);
    el.appendChild(node);
    createdTextNodes.add(node);
    return;
  }
  texts[0].nodeValue = value;
  for (const t of texts.slice(1)) t.nodeValue = "";
}

function patchImage(el: HTMLElement, value: string, alt: unknown) {
  const img = el instanceof HTMLImageElement ? el : el.querySelector("img");
  if (!img) return;
  img.removeAttribute("srcset");
  if (img.parentElement?.tagName === "PICTURE") {
    for (const source of Array.from(img.parentElement.querySelectorAll("source"))) source.removeAttribute("srcset");
  }
  if (value) img.setAttribute("src", value);
  else img.removeAttribute("src");
  if (typeof alt === "string") img.alt = alt;
}

/** Efter en refresh: ta bort textnoder från patch där React nu renderat egen text. */
function cleanupCreatedTextNodes() {
  for (const node of Array.from(createdTextNodes)) {
    const parent = node.parentNode;
    if (!parent) {
      createdTextNodes.delete(node);
      continue;
    }
    const others = Array.from(parent.childNodes).some((n) => n !== node && n.nodeType === Node.TEXT_NODE);
    if (others) {
      parent.removeChild(node);
      createdTextNodes.delete(node);
    }
  }
}

// ---------------------------------------------------------------------------
// Overlay: hover-ram + etikett, blink vid highlight
// ---------------------------------------------------------------------------

type Overlay = {
  setEnabled(enabled: boolean): void;
  highlight(page: string, key: string): void;
  destroy(): void;
};

function makeBox(): { box: HTMLDivElement; label: HTMLDivElement } {
  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.setAttribute("data-sitecms-overlay", "");
  Object.assign(box.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    display: "none",
    boxSizing: "border-box",
    border: `2px solid ${BRAND}`,
    borderRadius: "4px",
    boxShadow: "0 0 0 1px rgba(255,255,255,0.85)",
    pointerEvents: "none",
    zIndex: Z,
    margin: "0",
    padding: "0",
  } satisfies Partial<CSSStyleDeclaration>);
  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "absolute",
    left: "-2px",
    top: "-22px",
    maxWidth: "260px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    background: BRAND,
    color: "#fff",
    font: `600 11px/16px ${FONT}`,
    letterSpacing: "0",
    padding: "2px 6px",
    borderRadius: "4px",
    pointerEvents: "none",
    textTransform: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  box.appendChild(label);
  return { box, label };
}

function place(box: HTMLDivElement, label: HTMLDivElement, el: Element) {
  const r = el.getBoundingClientRect();
  const pad = 3;
  box.style.top = `${r.top - pad}px`;
  box.style.left = `${r.left - pad}px`;
  box.style.width = `${r.width + pad * 2}px`;
  box.style.height = `${r.height + pad * 2}px`;
  // Etiketten ovanför ramen, eller innanför om elementet ligger i överkanten.
  label.style.top = r.top < 26 ? "2px" : "-22px";
  label.style.left = r.top < 26 ? "2px" : "-2px";
}

function createOverlay(onFocus: (field: Field) => void): Overlay {
  const hover = makeBox();
  const flash = makeBox();
  flash.box.style.border = `3px solid ${BRAND}`;
  flash.box.style.boxShadow = `0 0 0 4px rgba(36,80,209,0.25)`;
  flash.label.style.display = "none";
  document.body.appendChild(hover.box);
  document.body.appendChild(flash.box);

  if (!prefersReducedMotion()) {
    hover.box.style.transition = "top 80ms ease-out, left 80ms ease-out, width 80ms ease-out, height 80ms ease-out";
  }

  let enabled = true;
  let current: HTMLElement | null = null;
  let flashTarget: HTMLElement | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;

  const hide = () => {
    current = null;
    hover.box.style.display = "none";
  };

  const update = () => {
    frame = 0;
    if (current) {
      if (current.isConnected) place(hover.box, hover.label, current);
      else hide();
    }
    if (flashTarget) {
      if (flashTarget.isConnected) place(flash.box, flash.label, flashTarget);
      else flash.box.style.display = "none";
    }
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  const target = (e: Event): HTMLElement | null => {
    const t = e.target;
    if (!(t instanceof Element)) return null;
    const el = t.closest<HTMLElement>(`[${ATTR}]`);
    return el && parseField(el.getAttribute(ATTR)) ? el : null;
  };

  const onOver = (e: MouseEvent) => {
    if (!enabled) return;
    const el = target(e);
    if (!el) return hide();
    if (el === current) return;
    current = el;
    hover.label.textContent = parseField(el.getAttribute(ATTR))!.key;
    hover.box.style.display = "block";
    place(hover.box, hover.label, el);
  };
  const onLeaveDocument = (e: MouseEvent) => {
    if (!e.relatedTarget) hide();
  };
  const onClick = (e: MouseEvent) => {
    if (!enabled || e.button !== 0) return;
    const el = target(e);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(parseField(el.getAttribute(ATTR))!);
  };

  document.addEventListener("mouseover", onOver, { passive: true });
  document.addEventListener("mouseout", onLeaveDocument, { passive: true });
  // Capture på window: körs före sidans egna klick-hanterare (React, länkar).
  window.addEventListener("click", onClick, true);
  window.addEventListener("scroll", schedule, { passive: true, capture: true });
  window.addEventListener("resize", schedule, { passive: true });

  return {
    setEnabled(value) {
      enabled = value;
      if (!value) hide();
    },
    highlight(page, key) {
      const el = elementsFor(page, key)[0];
      if (!el) return;
      const reduced = prefersReducedMotion();
      try {
        el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center", inline: "nearest" });
      } catch {
        el.scrollIntoView();
      }
      flashTarget = el;
      flash.box.style.display = "block";
      place(flash.box, flash.label, el);
      clearTimeout(flashTimer);
      if (!reduced && typeof flash.box.animate === "function") {
        flash.box.getAnimations?.().forEach((a) => a.cancel());
        flash.box.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }, { opacity: 0 }], {
          duration: 1400,
          easing: "ease-in-out",
          fill: "forwards",
        });
      } else {
        flash.box.style.opacity = "1";
      }
      flashTimer = setTimeout(() => {
        flashTarget = null;
        flash.box.style.display = "none";
      }, 1500);
    },
    destroy() {
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onLeaveDocument);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
      clearTimeout(flashTimer);
      hover.box.remove();
      flash.box.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Komponenten
// ---------------------------------------------------------------------------

type Incoming = Record<string, unknown> & { source?: unknown; v?: unknown; type?: unknown };

export function SitecmsPreviewClient({ panelOrigin, exitHref = "/api/sitecms/preview?disable=1" }: SitecmsPreviewClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startRefresh] = useTransition();
  const [mode, setMode] = useState<"unknown" | "frame" | "top">("unknown");
  const [refreshId, setRefreshId] = useState(0);
  const postedRefresh = useRef(0);
  const overlay = useRef<Overlay | null>(null);

  useEffect(() => {
    setMode(window.parent !== window ? "frame" : "top");
  }, []);

  const active = mode === "frame" && Boolean(panelOrigin);

  const post = useCallback(
    (message: Record<string, unknown>) => {
      if (!panelOrigin || window.parent === window) return;
      try {
        window.parent.postMessage({ source: "sitecms-preview", v: 1, ...message }, panelOrigin);
      } catch {
        // Fel origin eller stängd panel — inget att göra.
      }
    },
    [panelOrigin],
  );

  const postReady = useCallback(() => {
    post({ type: "ready", path: currentPath(), title: document.title, fields: collectFields() });
  }, [post]);

  // Meddelanden från panelen + overlay.
  useEffect(() => {
    if (!active) return;
    const ui = createOverlay((field) => post({ type: "focus", ...field }));
    overlay.current = ui;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== panelOrigin || event.source !== window.parent) return;
      const data = event.data as Incoming | null;
      if (!data || typeof data !== "object" || data.source !== "sitecms" || data.v !== 1) return;
      switch (data.type) {
        case "refresh":
          startRefresh(() => {
            router.refresh();
            setRefreshId((n) => n + 1);
          });
          return;
        case "patch": {
          if (!validPart(data.page) || !validPart(data.key) || typeof data.value !== "string") return;
          for (const el of elementsFor(data.page, data.key)) {
            if (data.kind === "text") patchText(el, data.value);
            else if (data.kind === "image") patchImage(el, data.value, data.alt);
          }
          return;
        }
        case "highlight":
          if (validPart(data.page) && validPart(data.key)) ui.highlight(data.page, data.key);
          return;
        case "overlays":
          if (typeof data.enabled === "boolean") ui.setEnabled(data.enabled);
          return;
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      ui.destroy();
      overlay.current = null;
    };
  }, [active, panelOrigin, post, router]);

  // "ready" vid mount och efter navigering (när DOM och titel hunnit uppdateras).
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(postReady, 30);
    return () => clearTimeout(timer);
  }, [active, pathname, postReady]);

  // "refreshed" + "ready" när en refresh renderats klart.
  useEffect(() => {
    if (!active || isPending || refreshId === 0 || refreshId === postedRefresh.current) return;
    postedRefresh.current = refreshId;
    cleanupCreatedTextNodes();
    const timer = setTimeout(() => {
      post({ type: "refreshed", path: currentPath() });
      postReady();
    }, 0);
    return () => clearTimeout(timer);
  }, [active, isPending, refreshId, post, postReady]);

  if (mode !== "top") return null;

  const href = `${exitHref}${exitHref.includes("?") ? "&" : "?"}path=${encodeURIComponent(pathname || "/")}`;
  return (
    <div
      role="region"
      aria-label="Förhandsgranskning"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 16,
        transform: "translateX(-50%)",
        zIndex: Number(Z),
        display: "flex",
        alignItems: "center",
        gap: 8,
        maxWidth: "calc(100vw - 32px)",
        boxSizing: "border-box",
        padding: "8px 14px",
        borderRadius: 999,
        background: "#121f47",
        color: "#fff",
        font: `500 13px/18px ${FONT}`,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <span>Förhandsgranskning</span>
      <span aria-hidden="true" style={{ opacity: 0.6 }}>
        ·
      </span>
      <a href={href} style={{ color: "#fff", textDecoration: "underline", textUnderlineOffset: 2 }}>
        Avsluta
      </a>
    </div>
  );
}

export default SitecmsPreviewClient;
