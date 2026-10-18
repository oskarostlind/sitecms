import { cookies } from "next/headers";
import { ATTRIBUTION_COOKIE, decodeAttribution, type Attribution } from "./attribution";

/** Läser first-touch-källan i en server action / route handler. Kastar aldrig. */
export async function readAttribution(): Promise<Attribution | null> {
  try {
    const jar = await cookies();
    return decodeAttribution(jar.get(ATTRIBUTION_COOKIE)?.value);
  } catch {
    return null;
  }
}
