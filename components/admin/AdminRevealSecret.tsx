"use client";

import { useState } from "react";

type AdminRevealSecretProps = {
  title: string;
  description: string;
  value: string;
};

/**
 * One-time reveal box for a freshly generated secret (API key, revalidate
 * secret, temp password). The value only ever reaches the browser via the
 * server action's redirect query string — this component doesn't fetch or
 * store it anywhere else, and it's gone the moment the admin navigates away
 * or reloads without the query param.
 */
export function AdminRevealSecret({ title, description, value }: AdminRevealSecretProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — the value
      // is still selectable/visible in the box below, so this is non-fatal.
    }
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <h2 className="text-sm font-semibold text-amber-900">{title}</h2>
      <p className="mt-1 text-sm text-amber-800">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="break-all rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-neutral-900">
          {value}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
        >
          {copied ? "Kopierad!" : "Kopiera"}
        </button>
      </div>
      <p className="mt-2 text-xs text-amber-700">
        Detta visas bara en gång. Spara värdet nu — det går inte att visa igen senare.
      </p>
    </div>
  );
}
