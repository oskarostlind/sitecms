/** Gemensamma klasser för textfält (Input, Textarea, Select). Internt för components/ui. */
export const fieldBase =
  "w-full rounded-lg border border-neutral-300 bg-white text-sm text-neutral-900 shadow-xs " +
  "placeholder:text-neutral-400 transition-colors duration-150 hover:border-neutral-400 " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500 disabled:hover:border-neutral-300 " +
  "read-only:bg-neutral-50";

export const fieldInvalid =
  "border-red-400 hover:border-red-400 focus:border-red-500 ring-2 ring-red-500/25 focus:ring-red-500/25";
