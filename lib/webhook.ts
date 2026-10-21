import { createHmac } from "node:crypto";

/**
 * Signerad webhook till kundsajtens revalidate-URL (ren modul — ingen
 * databas, inga nätverksanrop — så att den kan testas fristående, se
 * scripts/webhook-signature-test.ts).
 *
 * Format (kontraktet som sitecms-next och egna mottagare verifierar mot):
 *
 *   POST <revalidateUrl>
 *   content-type: application/json
 *   user-agent: sitecms-webhook
 *   x-sitecms-timestamp: <unix-sekunder>
 *   x-sitecms-signature: v1=<hex>[,v1=<hex>...]
 *
 *   { "event": "content.updated", "site": "<slug>", "timestamp": <unix-sekunder>, "secret"?: "<revalidateSecret>" }
 *
 * `<hex>` = HMAC-SHA256 med nyckeln = UTF-8-bytes för hex-strängen
 * sha256(apiKey) (= api_keys.key_hash) över `${timestamp}.${rawBody}`.
 * En v1-post per API-nyckel som sajten har — sitecms vet inte vilken nyckel
 * kundsajten använder, och klartexten finns aldrig hos oss.
 *
 * `secret` skickas bara när sajten har en revalidate-hemlighet, så att äldre
 * mottagare (`body.secret === CMS_REVALIDATE_SECRET`) fortsätter fungera.
 */

export const WEBHOOK_EVENT = "content.updated";
export const WEBHOOK_USER_AGENT = "sitecms-webhook";
export const WEBHOOK_TIMESTAMP_HEADER = "x-sitecms-timestamp";
export const WEBHOOK_SIGNATURE_HEADER = "x-sitecms-signature";
/** Mottagaren ska avvisa anrop vars tidsstämpel avviker mer än så här. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

export type WebhookPayload = {
  event: typeof WEBHOOK_EVENT;
  site: string;
  timestamp: number;
  secret?: string;
};

export type WebhookRequest = {
  /** Exakt den sträng som skickas som body (och som signerats). */
  body: string;
  headers: Record<string, string>;
  timestamp: number;
};

export type BuildWebhookInput = {
  /** Sajtens slug. */
  slug: string;
  /** Sajtens revalidate-hemlighet (legacy). Tom/null → skickas inte. */
  secret?: string | null;
  /** api_keys.key_hash för alla sajtens nycklar. */
  keyHashes: readonly string[];
  /** För tester; default nu. */
  now?: Date | number;
};

/** HMAC-SHA256 (hex) för en nyckel-hash över `${timestamp}.${rawBody}`. */
export function signWebhookBody(keyHash: string, timestamp: number, rawBody: string): string {
  return createHmac("sha256", Buffer.from(keyHash, "utf8")).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

/** Bygger body + headers för ett webhook-anrop. */
export function buildWebhookRequest(input: BuildWebhookInput): WebhookRequest {
  const nowMs = input.now === undefined ? Date.now() : typeof input.now === "number" ? input.now : input.now.getTime();
  const timestamp = Math.floor(nowMs / 1000);

  const payload: WebhookPayload = { event: WEBHOOK_EVENT, site: input.slug, timestamp };
  if (input.secret) payload.secret = input.secret;
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": WEBHOOK_USER_AGENT,
    [WEBHOOK_TIMESTAMP_HEADER]: String(timestamp),
  };

  // Samma nyckel kan inte finnas två gånger (unikt index), men var defensiv.
  const uniqueHashes = [...new Set(input.keyHashes.filter((h) => typeof h === "string" && h.length > 0))];
  if (uniqueHashes.length > 0) {
    headers[WEBHOOK_SIGNATURE_HEADER] = uniqueHashes
      .map((keyHash) => `v1=${signWebhookBody(keyHash, timestamp, body)}`)
      .join(",");
  }

  return { body, headers, timestamp };
}
