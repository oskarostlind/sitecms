"use client";

import { useState } from "react";
import { CharCounterField } from "./CharCounterField";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  SubmitButton,
  fieldIds,
} from "@/components/ui";
import { cn } from "@/lib/cn";

type SeoFormProps = {
  /** Server action, redan bunden till (siteId, seoId). */
  action: (formData: FormData) => void;
  pageSlug: string;
  /** Visningsdomän, t.ex. "firma.se". Tom sträng om ingen domän satts. */
  domain: string;
  siteName: string;
  initialTitle: string;
  initialDescription: string;
  initialOgImage: string;
};

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function clip(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()} …` : text;
}

/**
 * SEO-formuläret för en sida: titel/beskrivning med räknare och en live
 * "Så syns sidan i Google"-förhandsvisning. Renderar ett vanligt server
 * action-formulär med fälten `title`, `description`, `ogImage` och en enda
 * submit-knapp ("Spara").
 */
export function SeoForm({
  action,
  pageSlug,
  domain,
  siteName,
  initialTitle,
  initialDescription,
  initialOgImage,
}: SeoFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [ogImage, setOgImage] = useState(initialOgImage);
  const [brokenImage, setBrokenImage] = useState<string | null>(null);

  const host = domain || "din-sajt.se";
  const path = pageSlug.replace(/^\/+/, "");
  const initial = (siteName.trim()[0] ?? host[0] ?? "?").toUpperCase();
  const showImage = /^https?:\/\//i.test(ogImage.trim()) && brokenImage !== ogImage;

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sökresultat</CardTitle>
          <CardDescription>Det här visas när någon hittar sidan i Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CharCounterField
            id="title"
            name="title"
            label="Titel"
            limit={TITLE_LIMIT}
            value={title}
            onValueChange={setTitle}
            placeholder="T.ex. Takläggning i Umeå – Firma AB"
            hint="Kort och tydligt. Nämn gärna vad du gör och var."
          />
          <CharCounterField
            id="description"
            name="description"
            label="Beskrivning"
            limit={DESCRIPTION_LIMIT}
            multiline
            value={description}
            onValueChange={setDescription}
            placeholder="Kort beskrivning som visas under titeln i sökresultat"
            hint="En eller två meningar som får folk att vilja klicka."
          />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Så syns sidan i Google
            </p>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600 ring-1 ring-neutral-200"
                >
                  {initial}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm text-neutral-800">{siteName || host}</p>
                  <p className="truncate text-xs text-neutral-500">
                    https://{host}
                    {path ? ` › ${path}` : ""}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  "mt-2 text-lg leading-snug",
                  title.trim() ? "text-brand-700" : "italic text-neutral-400",
                )}
              >
                {title.trim() ? clip(title, TITLE_LIMIT) : "Ingen titel ännu"}
              </p>
              <p
                className={cn(
                  "mt-1 line-clamp-2 text-sm",
                  description.trim() ? "text-neutral-600" : "italic text-neutral-400",
                )}
              >
                {description.trim()
                  ? clip(description, DESCRIPTION_LIMIT)
                  : "Ingen beskrivning ännu – då väljer Google själv en textbit från sidan."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delning i sociala medier</CardTitle>
          <CardDescription>Bilden som visas när någon delar sidan på t.ex. Facebook eller LinkedIn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field htmlFor="ogImage" label="Delningsbild (webbadress)" hint="Klistra in en länk till bilden, t.ex. från mediabiblioteket.">
            <Input
              id="ogImage"
              name="ogImage"
              type="text"
              value={ogImage}
              onChange={(event) => setOgImage(event.target.value)}
              placeholder="https://..."
              aria-describedby={fieldIds("ogImage").hintId}
            />
          </Field>
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ogImage}
              alt=""
              onError={() => setBrokenImage(ogImage)}
              className="aspect-[1.91/1] w-full max-w-sm rounded-lg border border-neutral-200 bg-neutral-100 object-cover"
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingText="Sparar…">Spara</SubmitButton>
      </div>
    </form>
  );
}
