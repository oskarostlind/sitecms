/**
 * `#next-headers` utanför React Server Components (klientkod, SSR av
 * klientkomponenter, vanlig Node): ingen `next/headers`, alltså ingen
 * förhandsgranskning. Håller `next/headers` borta från klientbundlar.
 * Internt — ingår inte i paketets publika API.
 */
export type NextHeadersModule = {
  draftMode: () => unknown;
  cookies: () => unknown;
};

export async function loadNextHeaders(): Promise<NextHeadersModule | null> {
  return null;
}
