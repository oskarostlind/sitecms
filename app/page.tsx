import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import PlanetScene from "@/components/landing/PlanetScene";
import SmoothScroll from "@/components/landing/SmoothScroll";
import "./landing.css";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/seo";
import { LogoMark } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: { absolute: "sitecms – låt kunden redigera hemsidan själv" },
  description:
    "Svenskt CMS för småföretag: ändra texter, bilder, nyheter och priser på hemsidan själv. Utvecklaren kopplar Next.js-sajten på tio minuter.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "sitecms – låt kunden redigera hemsidan själv",
    description:
      "Kunden ändrar texter, bilder, nyheter och priser själv. Utvecklaren kopplar sajten på tio minuter. Gratis att börja.",
    url: "/",
  },
};

/* ---------------------------------------------------------------------------
   Ikoner – 24×24 inline-SVG enligt specen (stroke 1.6, pilen 2).
--------------------------------------------------------------------------- */

function Svg({ children, className = "icon" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const Icons = {
  workflow: (
    <Svg>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="15" y="15" width="6" height="6" rx="1.5" />
      <path d="M6 9v3a3 3 0 0 0 3 3h3" />
    </Svg>
  ),
  analytics: (
    <Svg>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-4" />
      <path d="M13 16V8" />
      <path d="M18 16v-7" />
    </Svg>
  ),
  leads: (
    <Svg>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  shield: (
    <Svg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  bolt: (
    <Svg>
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
    </Svg>
  ),
  globe: (
    <Svg>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
    </Svg>
  ),
  arrow: (
    <Svg className="icon icon-arrow">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Svg>
  ),
};

/** Inline reveal-fördröjning: style={rd(60)} → --rd: 60ms */
const rd = (ms: number) => ({ "--rd": `${ms}ms` }) as CSSProperties;

/* ---------------------------------------------------------------------------
   Innehåll
--------------------------------------------------------------------------- */

const NAV_LINKS = [
  { label: "Funktioner", href: "#features" },
  { label: "För utvecklare", href: "#solutions" },
  { label: "Guider", href: "/guider" },
  { label: "Dokumentation", href: "/docs" },
  { label: "Logga in", href: "/login" },
];

const LOGOS = ["JJ Bygg", "Swea Enterprise", "Kundnytt", "ReceptAPI"];

/** Huvudcaset – bara fakta som går att verifiera på kundens sajt och i integrationen. */
const FEATURED_CASE = {
  name: "JJ Bygg & Entreprenad",
  meta: "Bygg & entreprenad · Boden och Luleå",
  href: "https://www.jjbyggboden.se",
  domain: "jjbyggboden.se",
  steps: [
    {
      label: "Utmaningen",
      text: "Varje ny tjänst, ändrad text eller utbytt bild krävde att en utvecklare gick in i koden. Små ändringar blev liggande.",
    },
    {
      label: "Lösningen",
      text: "Sajten hämtar sidtexter, bilder, tjänster och SEO från sitecms via API. Fälten är låsta till det som får ändras – layouten går inte att ha sönder.",
    },
    {
      label: "Resultatet",
      text: "JJ Bygg uppdaterar rubriker, tjänstebeskrivningar och bilder själva i panelen, och ändringen syns på jjbyggboden.se inom en minut.",
    },
  ],
  tags: ["Sidtexter & bilder", "Tjänster", "SEO per sida", "Live inom 60 s"],
};

/** Kunder som är på väg in – inga resultat påstås innan de finns. */
const UPCOMING_CASES = [
  {
    name: "Swea Enterprise",
    meta: "Mellerud",
    text: "Ny hemsida som byggs direkt på sitecms, så att företaget kan uppdatera sitt innehåll själva från första dagen.",
    href: null,
    domain: "sweaenterprise.se",
  },
  {
    name: "Kundnytt",
    meta: "Omvärldsbevakning",
    text: "Sajtens innehåll flyttas in i sitecms. Hela caset publiceras när kopplingen är live.",
    href: "https://www.kundnytt.se",
    domain: "kundnytt.se",
  },
  {
    name: "ReceptAPI",
    meta: "API med svenska recept",
    text: "Sajtens innehåll kopplas till sitecms. Hela caset publiceras när kopplingen är live.",
    href: "https://receptapi.se",
    domain: "receptapi.se",
  },
];

const FEATURES = [
  {
    icon: Icons.workflow,
    title: "Texter & bilder",
    description:
      "Redigera rubriker, brödtext och bilder på dina sidor direkt i panelen — inget kodande, inga utvecklare inblandade.",
  },
  {
    icon: Icons.analytics,
    title: "Inlägg & nyheter",
    description:
      "Skriv, publicera och avpublicera nyheter och inlägg som visas på din sajt så fort du sparar.",
  },
  {
    icon: Icons.leads,
    title: "Tjänster & priser",
    description:
      "Håll din tjänstelista och dina priser uppdaterade så att kunder alltid ser rätt information.",
  },
  {
    icon: Icons.bolt,
    title: "SEO per sida",
    description:
      "Sätt titel, beskrivning och delningsbild för varje sida så att din sajt syns bättre i sökresultat.",
  },
  {
    icon: Icons.shield,
    title: "Mediabibliotek",
    description:
      "Ladda upp, organisera och återanvänd bilder från ett gemensamt bibliotek för hela sajten.",
  },
  {
    icon: Icons.globe,
    title: "Flera sajter – en inloggning",
    description:
      "Driver du fler än en sajt? Hantera dem alla från samma panel, med full koll på vad som ändrats och när.",
  },
];

const BARS = [62, 88, 47, 95, 71, 80, 58];

const ROWS = [
  { label: "Sidor", value: 90 },
  { label: "Inlägg", value: 72 },
  { label: "Tjänster", value: 48 },
  { label: "SEO", value: 34 },
];

const STATS = [
  { value: "< 60 s", label: "från spara till live" },
  { value: "0", label: "rader kod för kunden" },
  { value: "10 min", label: "att koppla en sajt" },
  { value: "100 %", label: "självbetjäning" },
];

const FOOTER_COLS = [
  {
    title: "Produkt",
    links: [
      { label: "Funktioner", href: "#features" },
      { label: "För utvecklare", href: "#solutions" },
      { label: "Dokumentation", href: "/docs" },
    ],
  },
  {
    title: "Konto",
    links: [
      { label: "Skapa konto", href: "/signup" },
      { label: "Logga in", href: "/login" },
      { label: "Glömt lösenord", href: "/forgot" },
    ],
  },
  {
    title: "Övrigt",
    links: [
      { label: "Guider", href: "/guider" },
      { label: "Integritet", href: "/integritet" },
      { label: "Kontakt", href: "mailto:info@oskarostlind.se" },
    ],
  },
];

/** Interna sidor via next/link, ankare och mailto som vanliga <a>. */
function NavLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

function Brand() {
  return (
    <a href="#top" className="brand" aria-label="sitecms – till toppen">
      <LogoMark size={22} className="brand-mark" />
      sitecms
    </a>
  );
}

/* ---------------------------------------------------------------------------
   Sidan
--------------------------------------------------------------------------- */

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <JsonLd nodes={[organizationJsonLd, websiteJsonLd, softwareJsonLd]} />
      <PlanetScene />
      <SmoothScroll />

      <div className="page" id="top">
        {/* SECTION 1 · HERO */}
        <header className="hero">
          <nav className="nav" aria-label="Huvudmeny">
            <Brand />
            <div className="nav-links">
              {NAV_LINKS.map((l) => (
                <NavLink key={l.label} href={l.href}>
                  {l.label}
                </NavLink>
              ))}
            </div>
            <Link href="/signup" className="btn btn-ghost">
              Skapa konto
            </Link>
          </nav>

          <div className="hero-inner">
            <h1 className="hero-title" data-reveal style={rd(60)}>
              Din hemsida,
              <br />
              utan <em>handpåläggning</em>
            </h1>
            <p className="hero-sub" data-reveal style={rd(180)}>
              Ett CMS där kunden redigerar texter, bilder, inlägg och priser själv — och
              utvecklaren kopplar sajten på tio minuter. Ingen väntan på någon annan.
            </p>
            <div className="hero-actions" data-reveal style={rd(300)}>
              <Link href="/signup" className="btn btn-primary">
                Skapa konto gratis
                {Icons.arrow}
              </Link>
              <Link href="/docs" className="btn btn-outline">
                Läs dokumentationen
              </Link>
            </div>
          </div>
        </header>

        <div className="logos" data-reveal style={rd(420)}>
          <p className="logos-label">Byggt för små företag och de som bygger åt dem</p>
          <div className="logos-row">
            {LOGOS.map((name) => (
              <a key={name} href="#kundcase" className="logo">
                {name}
              </a>
            ))}
          </div>
        </div>

        {/* SECTION · KUNDCASE */}
        <section className="section cases" id="kundcase">
          <div className="section-head">
            <span className="eyebrow" data-reveal>
              Kundcase
            </span>
            <h2 data-reveal style={rd(80)}>
              Så använder kunderna sitecms
            </h2>
            <p data-reveal style={rd(160)}>
              Riktiga sajter, riktiga ändringar – gjorda av kunden själv.
            </p>
          </div>

          <article className="case-featured" data-reveal style={rd(120)}>
            <div className="case-head">
              <div>
                <span className="case-status case-status-live">
                  <span className="dash-dot" />
                  Live
                </span>
                <h3>{FEATURED_CASE.name}</h3>
                <p className="case-meta">{FEATURED_CASE.meta}</p>
              </div>
              <a
                href={FEATURED_CASE.href}
                className="btn btn-outline case-link"
                target="_blank"
                rel="noopener"
              >
                Besök {FEATURED_CASE.domain}
                {Icons.arrow}
              </a>
            </div>
            <div className="case-steps">
              {FEATURED_CASE.steps.map((s) => (
                <div key={s.label} className="case-step">
                  <h4>{s.label}</h4>
                  <p>{s.text}</p>
                </div>
              ))}
            </div>
            <ul className="case-tags" aria-label="Används för">
              {FEATURED_CASE.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </article>

          <div className="case-grid">
            {UPCOMING_CASES.map((c, i) => (
              <article key={c.name} className="card case-card" data-reveal style={rd(i * 90)}>
                <span className="case-status">Kommer snart</span>
                <h3>{c.name}</h3>
                <p className="case-meta">{c.meta}</p>
                <p>{c.text}</p>
                {c.href ? (
                  <a href={c.href} className="case-domain" target="_blank" rel="noopener">
                    {c.domain} ↗
                  </a>
                ) : (
                  <span className="case-domain case-domain-muted">{c.domain} · lanseras snart</span>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 2 · FEATURES */}
        <section className="section features" id="features">
          <div className="section-head">
            <span className="eyebrow" data-reveal>
              Allt på ett ställe
            </span>
            <h2 data-reveal style={rd(80)}>
              Ett CMS som kunden faktiskt vågar använda
            </h2>
            <p data-reveal style={rd(160)}>
              Strukturerade fält i stället för fri sidbyggare: kunden kan ändra allt som ska
              ändras — och inget som kan gå sönder.
            </p>
          </div>

          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="card" data-reveal style={rd(i * 90)}>
                <div className="card-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 3 · SHOWCASE + STATS */}
        <section className="section showcase" id="solutions">
          <div className="showcase-grid">
            <div className="showcase-copy">
              <span className="eyebrow" data-reveal>
                För utvecklare
              </span>
              <h2 data-reveal style={rd(90)}>
                Koppla kundens sajt på tio minuter
              </h2>
              <p data-reveal style={rd(180)}>
                Skapa konto, skapa sajt, deklarera sajtens fält i en config-fil och hämta
                innehållet via ett API. När kunden sparar i panelen uppdateras sajten inom
                sekunder.
              </p>
              <div data-reveal style={rd(270)}>
                <Link href="/docs" className="btn btn-primary">
                  Så fungerar integrationen
                  {Icons.arrow}
                </Link>
              </div>
            </div>

            <div className="dashboard" data-reveal style={rd(160)} aria-hidden="true">
              <div className="dash-top">
                <span className="dash-title">Publicering · idag</span>
                <span className="dash-live">
                  <span className="dash-dot" />
                  Live
                </span>
              </div>
              <div className="dash-bars">
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    className="dash-bar"
                    style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
                  />
                ))}
              </div>
              <div className="dash-rows">
                {ROWS.map((r) => (
                  <div key={r.label} className="dash-row">
                    <span>
                      {r.label} {r.value}%
                    </span>
                    <span className="dash-track">
                      <span className="dash-fill" style={{ "--w": `${r.value}%` } as CSSProperties} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="stats">
            {STATS.map((s, i) => (
              <div key={s.label} className="stat" data-reveal style={rd(i * 80)}>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4 · CTA + FOOTER */}
        <section className="section cta" id="cta">
          <div className="cta-card">
            <span className="eyebrow" data-reveal style={rd(60)}>
              Redo när du är
            </span>
            <h2 data-reveal style={rd(140)}>
              Ge kunden nycklarna till sin egen hemsida
            </h2>
            <p data-reveal style={rd(220)}>
              Skapa ett konto, bjud in kunden och sluta vara flaskhalsen. Gratis att börja.
            </p>
            <div className="hero-actions" data-reveal style={rd(300)}>
              <Link href="/signup" className="btn btn-primary">
                Skapa konto gratis
                {Icons.arrow}
              </Link>
              <Link href="/login" className="btn btn-outline">
                Logga in
              </Link>
            </div>
          </div>

          <footer className="footer">
            <div className="footer-brand">
              <Brand />
              <p>Innehållshantering för små företag och deras utvecklare.</p>
            </div>
            <div className="footer-cols">
              {FOOTER_COLS.map((col) => (
                <div key={col.title} className="footer-col">
                  <h4>{col.title}</h4>
                  <ul>
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <NavLink href={l.href}>{l.label}</NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </footer>
          <p className="copyright">© {year} sitecms — byggt i Norrland.</p>
        </section>
      </div>
    </div>
  );
}
