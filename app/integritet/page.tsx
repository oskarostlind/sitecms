import type { Metadata } from "next";
import { GuideShell, lightLinkClassName, SpaceBreadcrumbs, SpaceHero } from "@/components/guides/GuideShell";
import { CONTACT_EMAIL } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Integritet och kakor",
  description: "Vilka uppgifter sitecms sparar om dig, varför, var de lagras och hur du får dem raderade.",
  alternates: { canonical: "/integritet" },
};

const UPDATED = "18 oktober 2026";

export default function PrivacyPage() {
  return (
    <GuideShell>
      <main className="pb-20">
        <SpaceHero innerClassName="pb-12 pt-8 sm:pb-16 sm:pt-10">
          <div className="mx-auto max-w-3xl">
            <SpaceBreadcrumbs items={[{ label: "sitecms", href: "/" }, { label: "Integritet och kakor" }]} />
            <h1 className="mt-8 text-balance text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-[2.6rem] sm:leading-[1.1]">
              Integritet och kakor
            </h1>
            <p className="mt-4 text-sm text-ink-muted">Senast uppdaterad {UPDATED}</p>
          </div>
        </SpaceHero>
        <div className="px-4 sm:px-6">
          <article className="mx-auto max-w-3xl pt-2 text-[16.5px] leading-[1.75] text-neutral-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-neutral-900 [&_li]:ml-5 [&_li]:list-disc [&_li]:marker:text-brand-500 [&_p]:mt-3 [&_strong]:font-semibold [&_strong]:text-neutral-900 [&_ul]:mt-3 [&_ul]:space-y-1.5">
            <h2>Vem ansvarar</h2>
            <p>
              sitecms drivs av Oskar Östlind. Frågor om dina uppgifter skickar du till{" "}
              <a className={lightLinkClassName} href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>

            <h2>Vad vi sparar</h2>
            <ul>
              <li>
                <strong>Konto:</strong> namn, e-postadress och lösenord. Lösenordet sparas bara som en krypterad hash och
                kan inte läsas av någon. Loggar du in med Google sparas namn och e-post från ditt Google-konto.
              </li>
              <li>
                <strong>Innehåll:</strong> texter, bilder, inlägg, tjänster och SEO-uppgifter som du eller andra med åtkomst
                lägger in för en sajt.
              </li>
              <li>
                <strong>Aktivitetslogg:</strong> vem som ändrade vad och när, så att ändringar kan följas upp och ångras.
              </li>
              <li>
                <strong>Var du hittade oss:</strong> vid ditt första besök sparar vi vilken sida du kom ifrån (till exempel
                en sökmotor eller en kampanjlänk) och vilken sida du landade på. Det kopplas till ditt konto om du skapar
                ett, så att vi vet vilka kanaler som fungerar. Vi använder ingen tredjepartsanalys och ingen annonsspårning.
              </li>
            </ul>

            <h2>Kakor</h2>
            <ul>
              <li>
                <strong>Inloggning:</strong> en nödvändig sessionskaka som håller dig inloggad.
              </li>
              <li>
                <strong>sc_src:</strong> en förstapartskaka med källan för ditt första besök (se ovan). Den gäller i 90
                dagar och läses bara av sitecms.
              </li>
            </ul>

            <h2>Var uppgifterna lagras</h2>
            <p>Vi använder följande leverantörer för att driva tjänsten:</p>
            <ul>
              <li>
                <strong>Vercel</strong> – drift av webbplatsen och lagring av uppladdade bilder.
              </li>
              <li>
                <strong>Neon</strong> – databas för konton, innehåll och aktivitetslogg.
              </li>
              <li>
                <strong>Resend</strong> – utskick av e-post (bekräftelse, inbjudningar och lösenordsåterställning).
              </li>
              <li>
                <strong>Google</strong> – endast om du väljer att logga in med Google.
              </li>
            </ul>

            <h2>Hur länge</h2>
            <p>
              Konto och innehåll sparas så länge kontot eller sajten finns. Du kan själv avsluta ditt konto under{" "}
              <em>Mitt konto</em>, och en ägare kan ta bort en sajt med allt innehåll under sajtens inställningar.
            </p>

            <h2>Dina rättigheter</h2>
            <p>
              Du har rätt att få veta vilka uppgifter vi har om dig, få dem rättade eller raderade, och att invända mot
              behandlingen. Hör av dig till {CONTACT_EMAIL}. Är du inte nöjd med hur vi hanterar dina uppgifter kan du vända
              dig till Integritetsskyddsmyndigheten (IMY).
            </p>
          </article>
        </div>
      </main>
    </GuideShell>
  );
}
