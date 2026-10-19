import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Engångsvisning av hemligheter (nya API-nycklar, revalidate-hemligheter).
 *
 * Tidigare skickades värdena i redirect-URL:en (?key=, ?newKey=, ?newSecret=),
 * vilket sparade dem i webbläsarhistoriken och i serverns/Vercels
 * förfrågningsloggar. Nu lämnas de i stället över i en cookie som är:
 *  - krypterad med AES-256-GCM (nyckel härledd ur AUTH_SECRET),
 *  - httpOnly, SameSite=Strict, Secure i produktion och begränsad till /admin,
 *  - kortlivad (2 minuter) och knuten till ett "scope" (en viss sajt), och
 *  - raderad direkt när sidan har visat den (se ConsumeReveal).
 */
export const REVEAL_COOKIE = "sitecms_reveal";
export const REVEAL_COOKIE_PATH = "/admin";
const MAX_AGE_SECONDS = 120;

export type RevealPayload = {
  /** "new-site" eller "site:<siteId>" — sidan visar bara värden för sitt eget scope. */
  scope: string;
  siteId?: string;
  siteName?: string;
  apiKey?: string;
  apiKeyName?: string;
  revalidateSecret?: string;
};

type Sealed = RevealPayload & { exp: number };

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET saknas — kan inte kryptera engångsvärden.");
  return createHash("sha256").update(`sitecms-reveal-v1:${secret}`).digest();
}

function seal(payload: RevealPayload): string {
  const body: Sealed = { ...payload, exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(body), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}

function unseal(token: string): RevealPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const json = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
    const body = JSON.parse(json) as Sealed;
    if (typeof body.exp !== "number" || body.exp < Date.now()) return null;
    const { exp: _exp, ...payload } = body;
    return payload;
  } catch {
    return null;
  }
}

/** Anropas från server actions precis före redirect. */
export async function setReveal(payload: RevealPayload): Promise<void> {
  const jar = await cookies();
  jar.set(REVEAL_COOKIE, seal(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REVEAL_COOKIE_PATH,
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Läser värdet om det finns, är giltigt och hör till sidans scope. */
export async function readReveal(scope: string): Promise<RevealPayload | null> {
  const jar = await cookies();
  const cookie = jar.get(REVEAL_COOKIE);
  if (!cookie) return null;
  const payload = unseal(cookie.value);
  return payload && payload.scope === scope ? payload : null;
}
