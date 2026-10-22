import { NextResponse } from "next/server";
import { CONTENT_CACHE_HEADERS, type ApiSite } from "@/app/api/v1/_lib/auth";
import { findValidPreviewSession, readPreviewHeader } from "@/lib/preview";
import { PREVIEW_INVALID_CODE, PREVIEW_INVALID_ERROR } from "@/lib/preview-protocol";

/** 401 när x-sitecms-preview är fel, utgången eller hör till en annan sajt (§3.1, §3.2). */
export function previewInvalidResponse(): Response {
  return NextResponse.json(
    { error: PREVIEW_INVALID_ERROR, code: PREVIEW_INVALID_CODE },
    { status: 401, headers: CONTENT_CACHE_HEADERS },
  );
}

/**
 * Shared body of GET /api/v1/site/preview and GET /api/v1/sites/[slug]/preview.
 *
 * Kundsajtens preview-route (sitecms-next/preview) verifierar token här innan
 * draft mode slås på:
 *   200 { ok: true, expiresAt: "<ISO>", panelOrigin: "https://sitecms.se" }
 *   401 { error, code: "preview_invalid" }  — fel/utgången token eller fel sajt
 * `panelOrigin` är den origin kundsajten ska ta emot postMessage från.
 */
export async function previewVerifyResponse(site: ApiSite, request: Request): Promise<Response> {
  const session = await findValidPreviewSession(site.id, readPreviewHeader(request));
  if (!session) return previewInvalidResponse();
  return NextResponse.json(
    { ok: true, expiresAt: session.expiresAt.toISOString(), panelOrigin: session.panelOrigin },
    { headers: CONTENT_CACHE_HEADERS },
  );
}
