/**
 * Färdig revalidate-route för Next.js App Router.
 *
 *   // app/api/sitecms/revalidate/route.ts
 *   export { POST } from "sitecms-next/revalidate";
 *
 * sitecms anropar routen (POST { secret }) varje gång kunden sparar.
 * Hemligheten jämförs med CMS_REVALIDATE_SECRET och cache-taggen "sitecms"
 * töms, så sajten visar det nya innehållet direkt.
 */
import { revalidateTag } from "next/cache.js";
import { verifyRevalidateSecret } from "./index.js";

export type RevalidateHandlerOptions = {
  /** Default: process.env.CMS_REVALIDATE_SECRET. */
  secret?: string;
  /** Cache-tagg att tömma. Default "sitecms" (samma som klienten). */
  tag?: string;
};

export function createRevalidateHandler(options: RevalidateHandlerOptions = {}) {
  return async function POST(request: Request): Promise<Response> {
    const expected = options.secret ?? process.env.CMS_REVALIDATE_SECRET;
    if (!expected) {
      return Response.json(
        { revalidated: false, error: "CMS_REVALIDATE_SECRET saknas på kundsajten." },
        { status: 500 },
      );
    }

    const body = (await request.json().catch(() => null)) as { secret?: unknown } | null;
    if (!(await verifyRevalidateSecret(body?.secret, expected))) {
      return Response.json({ revalidated: false, error: "Fel hemlighet." }, { status: 401 });
    }

    revalidateTag(options.tag ?? "sitecms");
    return Response.json({ revalidated: true, now: Date.now() });
  };
}

/** Route-handler med standardinställningar (läser CMS_REVALIDATE_SECRET). */
export const POST = createRevalidateHandler();
