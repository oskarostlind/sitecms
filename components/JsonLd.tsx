import { jsonLdScript, type JsonLd as Node } from "@/lib/seo";

/** Server-renderad strukturerad data (syns i serverns HTML, inte bara i webbläsaren). */
export function JsonLd({ nodes }: { nodes: Node[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(...nodes) }} />;
}
