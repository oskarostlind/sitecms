/**
 * Minimal kundsajt för att testa panelens live-förhandsgranskning lokalt —
 * utan sitecms-next. Implementerar kontraktets kundsida (docs/LIVE-PREVIEW.md
 * §4–5) i förenklad form: preview-routen, innehåll med x-sitecms-preview,
 * frame-headers och postMessage-protokollet v1.
 *
 *   node scripts/preview-test-site.mjs
 *
 * Env: PORT (4310), CMS_API_URL (http://localhost:3000),
 * CMS_API_KEY (scms_lokal_forhandsgranskning — från scripts/seed-preview-local.ts).
 * Bara för lokal utveckling.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || 4310);
const API = (process.env.CMS_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const KEY = process.env.CMS_API_KEY || "scms_lokal_forhandsgranskning";
const PANEL_ORIGINS = [new URL(API).origin];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((p) => p.trim().split("="))
      .filter(([k]) => k)
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );
}

async function getContent(token) {
  const headers = { "x-api-key": KEY };
  if (token) {
    const res = await fetch(`${API}/api/v1/site/content`, { headers: { ...headers, "x-sitecms-preview": token } });
    if (res.ok) return res.json();
    // Ogiltig/utgången token → vanligt innehåll (sajten får aldrig gå sönder).
  }
  const res = await fetch(`${API}/api/v1/site/content`, { headers });
  if (!res.ok) throw new Error(`content: HTTP ${res.status}`);
  return res.json();
}

function block(content, page, key) {
  return content.pages.find((p) => p.slug === page)?.blocks.find((b) => b.key === key) ?? { value: "", html: "", alt: "" };
}

const ed = (page, key) => `data-sitecms="${page}:${key}"`;

function renderMain(content, page) {
  if (page === "om-oss") {
    return `<h1 ${ed("om-oss", "om.title")}>${esc(block(content, "om-oss", "om.title").value)}</h1>
<div class="rte" ${ed("om-oss", "om.body")}>${block(content, "om-oss", "om.body").html ?? ""}</div>
<p ${ed("home", "kontakt.telefon")}>${esc(block(content, "home", "kontakt.telefon").value)}</p>`;
  }
  const img = block(content, "home", "hero.image");
  return `<h1 ${ed("home", "hero.title")}>${esc(block(content, "home", "hero.title").value)}</h1>
<p class="sub" ${ed("home", "hero.subtitle")}>${esc(block(content, "home", "hero.subtitle").value)}</p>
<img ${ed("home", "hero.image")} src="${esc(img.value)}" alt="${esc(img.alt)}" />
<div class="rte" ${ed("home", "intro.body")}>${block(content, "home", "intro.body").html ?? ""}</div>
<p>Ring oss: <strong ${ed("home", "kontakt.telefon")}>${esc(block(content, "home", "kontakt.telefon").value)}</strong></p>`;
}

const CLIENT = (panelOrigin) => `
(() => {
  const PANEL = ${JSON.stringify(panelOrigin)};
  const post = (msg) => window.parent.postMessage({ source: "sitecms-preview", v: 1, ...msg }, PANEL);
  const fields = () => [...document.querySelectorAll("[data-sitecms]")].map((el) => {
    const [page, key] = el.dataset.sitecms.split(":"); return { page, key };
  });
  const ready = () => post({ type: "ready", path: location.pathname, title: document.title, fields: fields() });
  if (window.parent === window) {
    document.body.insertAdjacentHTML("beforeend", '<div class="bar">Förhandsgranskning · <a href="/api/sitecms/preview?disable=1&path=/">Avsluta</a></div>');
    return;
  }
  let overlays = true;
  const sel = (page, key) => document.querySelectorAll('[data-sitecms="' + page + ":" + key + '"]');
  document.addEventListener("mouseover", (e) => {
    document.querySelectorAll(".sc-hover").forEach((el) => el.classList.remove("sc-hover"));
    const el = overlays && e.target.closest("[data-sitecms]");
    if (el) el.classList.add("sc-hover");
  });
  document.addEventListener("click", (e) => {
    const el = overlays && e.target.closest("[data-sitecms]");
    if (!el) return;
    e.preventDefault(); e.stopPropagation();
    const [page, key] = el.dataset.sitecms.split(":");
    post({ type: "focus", page, key });
  }, true);
  window.addEventListener("message", async (e) => {
    const d = e.data;
    if (e.origin !== PANEL || !d || d.source !== "sitecms" || d.v !== 1) return;
    if (d.type === "patch") {
      for (const el of sel(d.page, d.key)) {
        if (d.kind === "text" && el.children.length === 0) el.textContent = d.value;
        if (d.kind === "image") {
          const img = el.tagName === "IMG" ? el : el.querySelector("img");
          if (img) { img.removeAttribute("srcset"); img.src = d.value; if (d.alt != null) img.alt = d.alt; }
        }
      }
    } else if (d.type === "highlight") {
      const el = sel(d.page, d.key)[0];
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("sc-flash"); void el.offsetWidth; el.classList.add("sc-flash"); }
    } else if (d.type === "overlays") {
      overlays = d.enabled; document.documentElement.classList.toggle("sc-overlays", overlays);
    } else if (d.type === "refresh") {
      const html = await (await fetch(location.href, { cache: "no-store" })).text();
      const next = new DOMParser().parseFromString(html, "text/html").querySelector("main");
      if (next) document.querySelector("main").innerHTML = next.innerHTML;
      post({ type: "refreshed", path: location.pathname });
      ready();
    }
  });
  document.documentElement.classList.add("sc-overlays");
  ready();
})();`;

function page(content, slug, preview) {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${slug === "om-oss" ? "Om oss" : "Startsida"} – Testsajt</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;color:#1c1917;background:#fafaf9}
header{display:flex;gap:16px;padding:16px 24px;border-bottom:1px solid #e7e5e4;background:#fff}
header a{color:#0f766e;text-decoration:none;font-weight:600}
main{max-width:760px;margin:0 auto;padding:32px 24px}
h1{font-size:clamp(28px,5vw,44px);line-height:1.1;margin:0 0 12px}
.sub{font-size:18px;color:#57534e}
img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin:16px 0;background:#e7e5e4}
.rte{font-size:17px;line-height:1.6}
.sc-overlays .sc-hover{outline:2px solid #2fd38a;outline-offset:4px;cursor:pointer;border-radius:4px}
@keyframes scflash{0%,100%{outline-color:transparent}30%,70%{outline-color:#2fd38a}}
.sc-flash{outline:3px solid transparent;outline-offset:4px;animation:scflash 1.2s ease-out}
.bar{position:fixed;bottom:0;inset-inline:0;background:#111;color:#fff;padding:8px 16px;font-size:14px}.bar a{color:#5df0a8}
</style></head><body>
<header><a href="/">Startsida</a><a href="/om-oss">Om oss</a></header>
<main>${renderMain(content, slug)}</main>
${preview ? `<script>${CLIENT(preview.panelOrigin)}</script>` : ""}
</body></html>`;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const frame = { "Content-Security-Policy": `frame-ancestors 'self' ${PANEL_ORIGINS.join(" ")}` };
  try {
    if (url.pathname === "/api/sitecms/preview") {
      const raw = url.searchParams.get("path") || "/";
      const path = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
      if (url.searchParams.get("disable") === "1") {
        res.writeHead(307, { Location: path, "Set-Cookie": ["sitecms_preview=; Path=/; Max-Age=0", "sitecms_preview_origin=; Path=/; Max-Age=0"] });
        return res.end();
      }
      const token = url.searchParams.get("token") || "";
      const verify = await fetch(`${API}/api/v1/site/preview`, { headers: { "x-api-key": KEY, "x-sitecms-preview": token } });
      if (!verify.ok) {
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8", ...frame });
        return res.end("<p>Förhandsgranskningen kunde inte startas. Öppna den igen i sitecms.</p>");
      }
      const { panelOrigin } = await verify.json();
      const opts = "Path=/; HttpOnly; SameSite=Lax; Max-Age=7200";
      res.writeHead(307, {
        Location: path,
        "Set-Cookie": [`sitecms_preview=${encodeURIComponent(token)}; ${opts}`, `sitecms_preview_origin=${encodeURIComponent(panelOrigin)}; ${opts}`],
      });
      return res.end();
    }
    const slug = url.pathname === "/" ? "home" : url.pathname.slice(1);
    if (slug !== "home" && slug !== "om-oss") {
      res.writeHead(404, frame);
      return res.end("Hittades inte");
    }
    const c = cookies(req);
    const preview = c.sitecms_preview ? { panelOrigin: c.sitecms_preview_origin } : null;
    const content = await getContent(c.sitecms_preview);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...frame });
    res.end(page(content, slug, preview));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(String(err));
  }
});

server.listen(PORT, () => console.log(`Testsajt på http://localhost:${PORT} (API ${API})`));
