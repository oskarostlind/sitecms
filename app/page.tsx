import Link from "next/link";

const FEATURES = [
  {
    title: "Texter & bilder",
    description:
      "Redigera rubriker, brödtext och bilder på dina sidor direkt i panelen — inget kodande, inga utvecklare inblandade.",
  },
  {
    title: "Inlägg & nyheter",
    description:
      "Skriv, publicera och avpublicera nyheter och inlägg som visas på din sajt så fort du sparar.",
  },
  {
    title: "Tjänster & priser",
    description:
      "Håll din tjänstelista och dina priser uppdaterade så att kunder alltid ser rätt information.",
  },
  {
    title: "SEO per sida",
    description:
      "Sätt titel, beskrivning och delningsbild för varje sida så att din sajt syns bättre i sökresultat.",
  },
  {
    title: "Mediabibliotek",
    description:
      "Ladda upp, organisera och återanvänd bilder från ett gemensamt bibliotek för hela sajten.",
  },
  {
    title: "Flera sajter, en inloggning",
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

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-neutral-50 text-neutral-900">
      <section className="px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            sitecms
          </h1>
          <p className="mt-4 text-lg font-medium text-neutral-700 sm:text-xl">
            Redigera din hemsida — enkelt och tryggt.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base text-neutral-500">
            Sitecms ger småföretag och hantverkare full kontroll över sin
            hemsida: texter, bilder, inlägg, tjänster och priser — allt från
            en enkel panel, utan att behöva röra kod.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex h-11 w-full items-center justify-center rounded-lg bg-neutral-900/90 px-6 text-sm font-medium text-white transition hover:bg-neutral-900 sm:w-auto"
            >
              Logga in
            </Link>
            <a
              href="#sa-funkar-det"
              className="flex h-11 w-full items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 sm:w-auto"
            >
              Så funkar det
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Allt du behöver för att sköta din hemsida själv
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-base font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sa-funkar-det" className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Så funkar det
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900/90 text-sm font-semibold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Byggt för småföretag och hantverkare
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-500 sm:text-base">
            Du behöver varken vara tekniker eller ha en webbyrå på snabbval.
            Sitecms är gjort för dig som vill hålla din hemsida uppdaterad
            själv — tryggt, snabbt och utan krångel.
          </p>
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-neutral-900/90 px-6 text-sm font-medium text-white transition hover:bg-neutral-900"
            >
              Logga in
            </Link>
          </div>
        </div>
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
