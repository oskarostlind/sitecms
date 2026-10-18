import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/guides/GuideArticle";
import { JsonLd } from "@/components/JsonLd";
import { GUIDES, getGuide, relatedGuides } from "@/lib/guides";
import { plainText } from "@/lib/guides/text";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const path = `/guider/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      title: guide.h1,
      description: guide.description,
      publishedTime: guide.published,
      modifiedTime: guide.modified,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const url = absoluteUrl(`/guider/${guide.slug}`);

  return (
    <>
      <JsonLd
        nodes={[
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: guide.h1,
            description: guide.description,
            inLanguage: "sv-SE",
            datePublished: guide.published,
            dateModified: guide.modified,
            url,
            mainEntityOfPage: url,
            author: { "@id": `${SITE_URL}/#organization` },
            publisher: { "@id": `${SITE_URL}/#organization` },
            image: absoluteUrl("/opengraph-image"),
          },
          ...(guide.faq.length
            ? [
                {
                  "@type": "FAQPage",
                  "@id": `${url}#faq`,
                  mainEntity: guide.faq.map((f) => ({
                    "@type": "Question",
                    name: f.q,
                    acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
                  })),
                },
              ]
            : []),
          breadcrumbJsonLd([
            { name: "sitecms", path: "/" },
            { name: "Guider", path: "/guider" },
            { name: guide.title, path: `/guider/${guide.slug}` },
          ]),
        ]}
      />
      <GuideArticle guide={guide} related={relatedGuides(guide)} />
    </>
  );
}
