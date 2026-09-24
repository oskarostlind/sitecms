import Link from "next/link";
import {
  CircleCheck,
  Globe,
  Image as ImageIcon,
  Newspaper,
  PenLine,
  Search,
  Tag,
} from "lucide-react";
import { Badge, ButtonLink, Card, CardContent, Logo } from "@/components/ui";

const FEATURES = [
  {
    icon: PenLine,
    title: "Texter & bilder",
    description:
      "Redigera rubriker, brödtext och bilder på dina sidor direkt i panelen — inget kodande, inga utvecklare inblandade.",
  },
  {
    icon: Newspaper,
    title: "Inlägg & nyheter",
    description:
      "Skriv, publicera och avpublicera nyheter och inlägg som visas på din sajt så fort du sparar.",
  },
  {
    icon: Tag,
    title: "Tjänster & priser",
    description:
      "Håll din tjänstelista och dina priser uppdaterade så att kunder alltid ser rätt information.",
  },
  {
    icon: Search,
    title: "SEO per sida",
    description:
      "Sätt titel, beskrivning och delningsbild för varje sida så att din sajt syns bättre i sökresultat.",
  },
  {
    icon: ImageIcon,
    title: "Mediabibliotek",
    description:
      "Ladda upp, organisera och återanvänd bilder från ett gemensamt bibliotek för hela sajten.",
  },
  {
    icon: Globe,
    title: "Flera sajter – en inloggning",
    description:
      "Driver du fler än en sajt? Hantera dem alla från samma panel, med full koll på vad som ändrats och när.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Logga in",
    description: "Logga in säkert med din e-post eller ditt Google-konto — ingen teknisk kunskap krävs.",
  },
  {
    number: "2",
    title: "Redigera",
    description: "Ändra texter, byt bilder, lägg till inlägg eller uppdatera tjänster och priser i panelen.",
  },
  {
    number: "3",
    title: "Publicera",
    description: "Spara dina ändringar — de syns direkt på din riktiga sajt, live för dina besökare.",
  },
];

const TRUST_POINTS = [
  "Du kan inte ha sönder sajten – bara innehållet ändras",
  "Varje ändring kan ångras",
  "Ändringar syns på sajten inom några sekunder",
];

/** Ren CSS/HTML-illustration av redigeringspanelen – ingen bildfil. */
function ProductIllustration() {
  return (
    <div className="mx-auto mt-14 max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl shadow-neutral-900/5">
        <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
          <span className="size-2.5 rounded-full bg-neutral-300" />
        </div>
        <div className="flex">
          {/* Falsk sidebar */}
          <div className="hidden w-40 shrink-0 space-y-1.5 border-r border-neutral-200 bg-white p-4 sm:block">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="size-4 rounded-md bg-brand-600" aria-hidden />
              <span className="h-2 w-16 rounded-full bg-neutral-200" />
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 " +
                  (i === 1 ? "bg-brand-50" : "")
                }
              >
                <span className={"size-3 rounded-sm " + (i === 1 ? "bg-brand-400" : "bg-neutral-200")} />
                <span
                  className={
                    "h-2 rounded-full " + (i === 1 ? "w-14 bg-brand-300" : "w-10 bg-neutral-200")
                  }
                />
              </div>
            ))}
          </div>

          {/* Huvudyta */}
          <div className="flex-1 space-y-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="h-2.5 w-28 rounded-full bg-neutral-300" />
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Sparat ✓
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-neutral-500">Rubrik</span>
              <div className="flex h-9 items-center rounded-lg border border-neutral-300 bg-white px-3 text-sm text-neutral-800">
                Professionell bygg &amp; entreprenad
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-neutral-500">Text</span>
              <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <span className="block h-2 w-full rounded-full bg-neutral-200" />
                <span className="block h-2 w-5/6 rounded-full bg-neutral-200" />
                <span className="block h-2 w-2/3 rounded-full bg-neutral-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <header className="px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            <ButtonLink href="#sa-funkar-det" variant="ghost">
              Så funkar det
            </ButtonLink>
            <ButtonLink href="/login" variant="primary">
              Logga in
            </ButtonLink>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_at_top,_var(--color-brand-50)_0%,_transparent_65%)]"
        />
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand">För småföretag &amp; hantverkare</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Redigera din hemsida – enkelt och tryggt.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-neutral-500 sm:text-lg">
            Sitecms ger småföretag och hantverkare full kontroll över sin hemsida: texter,
            bilder, inlägg, tjänster och priser — allt från en enkel panel, utan att behöva
            röra kod.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/login" size="lg" className="w-full sm:w-auto">
              Logga in
            </ButtonLink>
            <ButtonLink href="#sa-funkar-det" variant="secondary" size="lg" className="w-full sm:w-auto">
              Så funkar det
            </ButtonLink>
          </div>
        </div>

        <ProductIllustration />
      </section>

      <section className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Allt du behöver för att sköta hemsidan själv
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardContent className="space-y-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                    <Icon aria-hidden className="size-5 text-brand-600" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight">{title}</h3>
                  <p className="text-sm text-neutral-500">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="sa-funkar-det" className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Så funkar det
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-24">
        <Card className="mx-auto max-w-3xl">
          <CardContent className="text-center sm:p-10">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Byggt för dig som inte är tekniker
            </h2>
            <ul className="mx-auto mt-6 max-w-md space-y-3 text-left">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-600" />
                  <span className="text-sm text-neutral-700 sm:text-base">{point}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <ButtonLink href="/login" size="lg">
                Logga in
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-auto border-t border-neutral-200 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-sm text-neutral-500 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} sitecms</span>
          <Link href="/login" className="hover:text-neutral-700">
            Logga in
          </Link>
        </div>
      </footer>
    </main>
  );
}
