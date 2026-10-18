import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, Info, TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { CodeBlock } from "@/components/admin/CodeBlock";
import { RichText } from "./RichText";
import { AUDIENCE_LABELS, type Guide, type GuideBlock } from "@/lib/guides/types";
import { formatGuideDate, readingMinutes } from "@/lib/guides/text";

const prose =
  "text-[16.5px] leading-[1.75] text-neutral-700 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline [&_a]:decoration-brand-300 [&_a]:underline-offset-2 hover:[&_a]:decoration-brand-600 [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:text-neutral-900 [&_strong]:font-semibold [&_strong]:text-neutral-900";

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "p":
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    case "h3":
      return (
        <h3 className="pt-2 text-lg font-semibold tracking-tight text-neutral-900">
          <RichText text={block.text} />
        </h3>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 pl-6 marker:text-neutral-400">
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="list-decimal space-y-1.5 pl-6 marker:font-medium marker:text-neutral-500">
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <figure className="not-prose -mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[520px] border-collapse overflow-hidden rounded-xl border border-neutral-200 bg-white text-left text-[14.5px]">
            {block.caption ? (
              <caption className="caption-bottom px-1 pt-2 text-left text-xs text-neutral-500">
                <RichText text={block.caption} />
              </caption>
            ) : null}
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-700">
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) =>
                    c === 0 ? (
                      <th key={c} scope="row" className="px-4 py-2.5 align-top font-medium text-neutral-900">
                        <RichText text={cell} />
                      </th>
                    ) : (
                      <td key={c} className="px-4 py-2.5 align-top">
                        <RichText text={cell} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );
    case "tip":
    case "warning": {
      const warn = block.type === "warning";
      const Icon = warn ? TriangleAlert : Info;
      return (
        <aside
          className={
            warn
              ? "flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[15.5px]"
              : "flex gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 text-[15.5px]"
          }
        >
          <Icon aria-hidden className={warn ? "mt-1 size-4 shrink-0 text-amber-600" : "mt-1 size-4 shrink-0 text-brand-600"} />
          <div>
            {block.title ? <p className="font-semibold text-neutral-900">{block.title}</p> : null}
            <p>
              <RichText text={block.text} />
            </p>
          </div>
        </aside>
      );
    }
    case "code":
      return <CodeBlock code={block.code} filename={block.filename} language={block.lang} />;
  }
}

export function GuideArticle({ guide, related }: { guide: Guide; related: Guide[] }) {
  return (
    <main className="px-4 pb-16 sm:px-6">
      <div className="mx-auto max-w-6xl pt-8 sm:pt-12">
        <nav aria-label="Brödsmulor" className="text-sm text-neutral-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-neutral-800">
                sitecms
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href="/guider" className="hover:text-neutral-800">
                Guider
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="truncate text-neutral-700" aria-current="page">
              {guide.title}
            </li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
          <article className="min-w-0">
            <header className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{AUDIENCE_LABELS[guide.audience]}</p>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-neutral-900 sm:text-[2.6rem] sm:leading-[1.12]">
                {guide.h1}
              </h1>
              <div className={`space-y-4 ${prose} text-[17.5px]`}>
                {guide.intro.map((p, i) => (
                  <p key={i}>
                    <RichText text={p} />
                  </p>
                ))}
              </div>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays aria-hidden className="size-4" />
                  Uppdaterad <time dateTime={guide.modified}>{formatGuideDate(guide.modified)}</time>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden className="size-4" />
                  {readingMinutes(guide)} min läsning
                </span>
              </p>
            </header>

            {guide.summary?.length ? (
              <section aria-label="Kort svar" className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Kort svar</h2>
                <ul className={`mt-3 list-disc space-y-1.5 pl-5 marker:text-brand-500 ${prose}`}>
                  {guide.summary.map((s, i) => (
                    <li key={i}>
                      <RichText text={s} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="mt-10 space-y-12">
              {guide.sections.map((section) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-h`} className="scroll-mt-24">
                  <h2 id={`${section.id}-h`} className="text-balance text-2xl font-semibold tracking-tight text-neutral-900">
                    {section.heading}
                  </h2>
                  <div className={`mt-4 space-y-4 ${prose}`}>
                    {section.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                  </div>
                </section>
              ))}

              {guide.faq.length ? (
                <section id="vanliga-fragor" aria-labelledby="vanliga-fragor-h" className="scroll-mt-24">
                  <h2 id="vanliga-fragor-h" className="text-2xl font-semibold tracking-tight text-neutral-900">
                    Vanliga frågor
                  </h2>
                  <div className="mt-4 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
                    {guide.faq.map((f, i) => (
                      <div key={i} className="p-5 sm:p-6">
                        <h3 className="text-base font-semibold text-neutral-900">{f.q}</h3>
                        <p className={`mt-2 ${prose} text-[15.5px]`}>
                          <RichText text={f.a} />
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <Cta kind={guide.cta} />

              {guide.sources?.length ? (
                <section aria-labelledby="kallor-h">
                  <h2 id="kallor-h" className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                    Källor
                  </h2>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                    {guide.sources.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} rel="noopener" target="_blank" className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </article>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <nav aria-label="Innehåll i guiden" className="text-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Innehåll</p>
                <ul className="space-y-1.5 border-l border-neutral-200">
                  {guide.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-3 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900">
                        {s.heading}
                      </a>
                    </li>
                  ))}
                  {guide.faq.length ? (
                    <li>
                      <a href="#vanliga-fragor" className="-ml-px block border-l border-transparent pl-3 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900">
                        Vanliga frågor
                      </a>
                    </li>
                  ) : null}
                </ul>
              </nav>
            </div>
          </aside>
        </div>

        {related.length ? (
          <section aria-labelledby="relaterat-h" className="mt-16 border-t border-neutral-200 pt-10">
            <h2 id="relaterat-h" className="text-xl font-semibold tracking-tight text-neutral-900">
              Fler guider
            </h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guider/${g.slug}`}
                    className="group flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
                  >
                    <span className="text-xs font-medium text-brand-600">{AUDIENCE_LABELS[g.audience]}</span>
                    <span className="mt-1 font-semibold text-neutral-900 group-hover:text-brand-700">{g.h1}</span>
                    <span className="mt-2 line-clamp-3 text-sm text-neutral-500">{g.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Cta({ kind }: { kind: Guide["cta"] }) {
  const content =
    kind === "utvecklare"
      ? {
          title: "Låt kunden sköta texterna – du sköter koden",
          text: "Med sitecms deklarerar du sajtens fält i en config-fil och bjuder in kunden som redaktör. Kunden ändrar texter, bilder, nyheter och priser själv; sajten uppdateras inom sekunder.",
          primary: { href: "/signup", label: "Skapa konto gratis" },
          secondary: { href: "/docs", label: "Läs dokumentationen" },
        }
      : {
          title: "Ändra hemsidan själv – utan att kunna förstöra den",
          text: "sitecms ger dig en enkel panel för texter, bilder, nyheter, tjänster och priser på hemsidan. Allt du ändrar kan ångras. Har någon annan byggt sajten skickar du dem länken nedan — kopplingen tar ungefär tio minuter.",
          primary: { href: "/signup", label: "Skapa konto gratis" },
          secondary: { href: "/docs", label: "Länk till din utvecklare" },
        };
  return (
    <aside className="rounded-2xl bg-neutral-900 p-6 text-white sm:p-8">
      <h2 className="text-xl font-semibold tracking-tight">{content.title}</h2>
      <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-neutral-300">{content.text}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href={content.primary.href} icon={<ArrowRight />}>
          {content.primary.label}
        </ButtonLink>
        <Link
          href={content.secondary.href}
          className="inline-flex items-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          {content.secondary.label}
        </Link>
      </div>
    </aside>
  );
}
