/**
 * `#next-headers` i React Server Components (villkoret "react-server":
 * serverkomponenter och route handlers i Next.js App Router). Importeras
 * dynamiskt så att ett fel (t.ex. utanför en request) aldrig kastar vid import.
 * Internt — ingår inte i paketets publika API.
 */
import type { NextHeadersModule } from "./next-headers.js";

export type { NextHeadersModule };

export async function loadNextHeaders(): Promise<NextHeadersModule | null> {
  try {
    return (await import("next/headers.js")) as unknown as NextHeadersModule;
  } catch {
    return null;
  }
}
