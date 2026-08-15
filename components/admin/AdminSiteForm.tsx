"use client";

import { useState } from "react";
import { slugify } from "@/components/content/slugify";

type AdminSiteFormProps = {
  action: (formData: FormData) => void;
};

/**
 * Create-site form. The slug field auto-follows the name until the admin
 * edits it manually, same "auto-genereras, redigerbar" pattern as
 * components/content/PostForm.tsx's title -> slug field.
 */
export function AdminSiteForm({ action }: AdminSiteFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">
          Namn
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(event) => {
            const nextName = event.target.value;
            setName(nextName);
            if (!slugTouched) {
              setSlug(slugify(nextName));
            }
          }}
          placeholder="T.ex. Exempel Bygg AB"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-neutral-700">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          placeholder="genereras automatiskt från namnet"
          className={`${inputClassName} font-mono`}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Genereras automatiskt från namnet men kan ändras här. Måste vara unik.
        </p>
      </div>

      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-neutral-700">
          Domän
        </label>
        <input
          id="domain"
          name="domain"
          type="text"
          placeholder="T.ex. exempel.se"
          className={inputClassName}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Skapa sajt
        </button>
      </div>
    </form>
  );
}
