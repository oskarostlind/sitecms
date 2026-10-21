/**
 * Färdig revalidate-route för Next.js App Router.
 *
 *   // app/api/sitecms/revalidate/route.ts
 *   export { POST } from "sitecms-next/revalidate";
 *
 * sitecms anropar routen varje gång kunden sparar. Anropet är signerat
 * (x-sitecms-signature) med sajtens API-nyckel, så det räcker att
 * CMS_API_KEY finns på sajten. Äldre sajter som skickar `secret` i bodyn
 * godkänns också om CMS_REVALIDATE_SECRET är satt. Därefter töms
 * cache-taggen "sitecms" och sajten visar det nya innehållet direkt.
 */
import { revalidateTag } from "next/cache.js";
import { verifyWebhookDetailed } from "./index.js";

export type RevalidateHandlerOptions = {
  /** Äldre revalidate-hemlighet. Default: process.env.CMS_REVALIDATE_SECRET. */
  secret?: string;
  /** API-nyckel som signaturen kontrolleras mot. Default: process.env.CMS_API_KEY. */
  apiKey?: string;
  /** Cache-tagg att tömma. Default "sitecms" (samma som klienten). */
  tag?: string;
};

function env(name: string): string {
  return (typeof process !== "undefined" && process.env?.[name]?.trim()) || "";
}

export function createRevalidateHandler(options: RevalidateHandlerOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
    const apiKey = (options.apiKey ?? env("CMS_API_KEY")).trim();
    const secret = (options.secret ?? env("CMS_REVALIDATE_SECRET")).trim();
    if (!apiKey && !secret) {
      return Response.json(
        {
          revalidated: false,
          error:
            "CMS_API_KEY saknas på kundsajten. Lägg in den som miljövariabel hos webbhotellet och deploya om (eller sätt CMS_REVALIDATE_SECRET för äldre sajter).",
        },
        { status: 500 },
      );
    }

    // Läs bodyn exakt en gång: signaturen gäller de råa bytena.
    const rawBody = await request.text().catch(() => "");
    const result = await verifyWebhookDetailed({ rawBody, headers: request.headers, apiKey, legacySecret: secret });
    if (!result.ok) {
      // Klockfel får ett eget meddelande (sitecms visar det i panelens felrad);
      // övriga fel samma svar som tidigare.
      const error =
        result.reason === "timestamp-out-of-range"
          ? result.message
          : "Ogiltig signatur eller hemlighet (kontrollera CMS_API_KEY).";
      return Response.json({ revalidated: false, error, reason: result.reason }, { status: 401 });
    }

    // Next.js 16+: { expire: 0 } gör att nästa anrop väntar på färskt innehåll
    // (rekommenderat för webhooks; formen med bara taggen är utfasad där).
    // Next.js 14–15 tar bara taggen och ignorerar det andra argumentet.
    (revalidateTag as (tag: string, profile?: string | { expire?: number }) => void)(options.tag ?? "sitecms", {
      expire: 0,
    });
    return Response.json({ revalidated: true, now: Date.now() });
  };
}

/** Route-handler med standardinställningar (läser CMS_API_KEY och CMS_REVALIDATE_SECRET). */
export const POST = createRevalidateHandler();
