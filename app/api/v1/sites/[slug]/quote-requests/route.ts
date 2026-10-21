import { NextResponse } from "next/server";
import { authenticateSite } from "@/app/api/v1/_lib/auth";
import { quoteRequestResponse } from "@/app/api/v1/_lib/quote-requests";

/**
 * POST /api/v1/sites/[slug]/quote-requests
 *
 * Called server-to-server by a customer site's quote form (x-api-key).
 * Validation, rate limit, storage and e-mail: app/api/v1/_lib/quote-requests.ts.
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const auth = await authenticateSite(slug, request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return quoteRequestResponse(auth.site, request);
}
