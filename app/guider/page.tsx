import type { Metadata } from "next";
import Link from "next/link";
import { SpaceBreadcrumbs, SpaceHero } from "@/components/guides/GuideShell";
import { JsonLd } from "@/components/JsonLd";
import { guidesFor } from "@/lib/guides";
import { formatGuideDate, readingMinutes } from "@/lib/guides/text";
import type { Guide } from "@/lib/guides/types";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Guider: sköt hemsidan själv",
  description:
    "Praktiska guider på svenska: ändra text och bilder, uppdatera priser och öppettider, lägga upp nyheter – och för utvecklare som vill låta kunden redigera själv.",
  alternates: { canonical: "/guider" },
};

const GROUPS: { id: "smaforetag" | "utvecklare"; title: string; text: string }[] = [
  {
    id: "smaforetag",
    title: "För dig som har ett företag",
    text: "Steg för steg för vanliga ändringar på hemsidan – oavsett vem som byggt den eller vilket system den körs på.",
  },
  {
    id: "utvecklare",
    title: "För utvecklare och webbyråer",
    text: "När du bygger sajten men inte vill vara den som byter öppettider i december.",
  },
];

export default function GuidesIndex() {
  const groups = GROUPS.map((g) => ({ ...g, guides: guidesFor(g.id) }));
  const all = groups.flatMap((g) => g.guides);

  return (
    <main>
      <JsonLd
        nodes={[
          {
            "@type": "CollectionPage",
            name: "Guider från sitecms",
            url: absoluteUrl("/guider"),
            inLanguage: "sv-SE",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: all.map((g, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(`/guider/${g.slug}`),
                name: g.h1,
              })),
            },
          },
          breadcrumbJsonLd([
            { name: "sitecms", path: "/" },
            { name: "Guider", path: "/guider" },
          ]),
        ]}
      />
      <SpaceHero planet="corner" innerClassName="pb-16 pt-10 sm:pb-24 sm:pt-14">
        <SpaceBreadcrumbs items={[{ label: "sitecms", href: "/" }, { label: "Guider" }]} />
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Guider</p>
        <h1 className="mt-3 max-w-3xl text-balance text-3xl font-extrabold tracking-[-0.02em] text-ink sm:text-5xl sm:leading-[1.05]">
          Sköt hemsidan själv – utan att vänta på någon
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          Konkreta, svenska guider för de ändringar som faktiskt behöver göras: texter, bilder, priser, öppettider och
          nyheter. Och för utvecklare som vill lämna över redigeringen till kunden.
        </p>
      </SpaceHero>

      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {groups.map((group) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-h`} className="mt-14 scroll-mt-28">
            <h2 id={`${group.id}-h`} className="text-2xl font-semibold tracking-tight text-neutral-900">
              {group.title}
            </h2>
            <p className="mt-1 text-neutral-600">{group.text}</p>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.guides.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <li>
      <Link
        href={`/guider/${guide.slug}`}
        className="group flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(4,6,15,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-brand-500/50 hover:shadow-[0_12px_32px_-16px_rgba(4,6,15,0.25)]"
      >
        <span className="font-semibold leading-snug text-neutral-900 group-hover:text-brand-700">{guide.h1}</span>
        <span className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600">{guide.description}</span>
        <span className="mt-4 text-xs text-neutral-500">
          {readingMinutes(guide)} min · uppdaterad {formatGuideDate(guide.modified)}
        </span>
      </Link>
    </li>
  );
}
