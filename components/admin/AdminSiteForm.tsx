"use client";

import { useState } from "react";
import { slugify } from "@/components/content/slugify";
import { Field, Input, SubmitButton } from "@/components/ui";

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

  return (
    <form action={action} className="space-y-5">
      <Field htmlFor="name" label="Namn" required>
        <Input
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
        />
      </Field>

      <Field htmlFor="slug" label="Slug" hint="Genereras automatiskt från namnet men kan ändras här. Måste vara unik.">
        <Input
          id="slug"
          name="slug"
          type="text"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          placeholder="genereras automatiskt från namnet"
          className="font-mono"
        />
      </Field>

      <Field htmlFor="domain" label="Domän" hint="T.ex. exempel.se – kan läggas till senare.">
        <Input id="domain" name="domain" type="text" placeholder="T.ex. exempel.se" />
      </Field>

      <SubmitButton pendingText="Skapar…">Skapa sajt</SubmitButton>
    </form>
  );
}
