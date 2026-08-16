"use client";

import { useState } from "react";
import { slugify } from "./slugify";
import ImageField from "@/components/admin/ImageField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { markdownToHtml } from "@/lib/markdown";

type PostFormPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
  published: boolean;
};

type PostFormProps = {
  siteId: string;
  action: (formData: FormData) => void;
  post?: PostFormPost | null;
};

/**
 * Shared create/edit form for a post. The slug field auto-follows the title
 * until the user edits it manually (slugTouched), matching the "auto-genereras,
 * redigerbar" requirement.
 *
 * Brödtexten skrivs i en WYSIWYG-editor och omslagsbilden laddas upp direkt
 * från datorn eller telefonen — kunden ska aldrig behöva kunna markdown eller
 * ha en bild-URL till hands. Värdena följer med i formuläret via dolda fält,
 * eftersom editorn och bildfältet inte är vanliga <input>.
 *
 * Fliken "Förhandsgranska" visar inlägget som det kommer att se ut, så att man
 * kan kontrollera innan man sparar — sparning går direkt ut på kundens sajt.
 */
export function PostForm({ siteId, action, post = null }: PostFormProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [coverImageAlt, setCoverImageAlt] = useState(post?.coverImageAlt ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [previewing, setPreviewing] = useState(false);

  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  const tabClassName = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-white text-neutral-900 shadow-sm"
        : "text-neutral-500 hover:text-neutral-800"
    }`;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      {/* Fälten nedan styrs av editorn/bildfältet och skickas med som dolda fält. */}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="coverImage" value={coverImage} />
      <input type="hidden" name="coverImageAlt" value={coverImageAlt} />

      <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() => setPreviewing(false)}
          className={tabClassName(!previewing)}
        >
          Skriv
        </button>
        <button
          type="button"
          onClick={() => setPreviewing(true)}
          className={tabClassName(previewing)}
        >
          Förhandsgranska
        </button>
      </div>

      <div className={previewing ? "hidden" : "space-y-5"}>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-neutral-700">
            Titel
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (!slugTouched) {
                setSlug(slugify(nextTitle));
              }
            }}
            placeholder="T.ex. Så väljer du rätt altandäck"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-neutral-700">
            Webbadress (URL-slug)
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
            placeholder="genereras automatiskt från titeln"
            className={`${inputClassName} font-mono`}
          />
          <p className="mt-1 text-xs text-neutral-500">
            Genereras automatiskt från titeln men kan ändras här.
          </p>
        </div>

        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-neutral-700">
            Utdrag
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={2}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            placeholder="Kort sammanfattning som visas i listor"
            className={inputClassName}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-neutral-700">Brödtext</span>
          <div className="mt-1">
            <RichTextEditor
              value={body}
              onChange={setBody}
              ariaLabel="Brödtext"
              placeholder="Skriv inlägget här. Markera text och klicka på Fet eller Rubrik för att formatera."
              minHeight={260}
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-neutral-700">Omslagsbild</span>
          <div className="mt-1">
            <ImageField
              siteId={siteId}
              value={coverImage}
              alt={coverImageAlt}
              onChange={(next) => {
                setCoverImage(next.value);
                setCoverImageAlt(next.alt);
              }}
            />
          </div>
        </div>
      </div>

      {previewing && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="mb-4 text-xs uppercase tracking-wide text-neutral-400">
            Så här kommer inlägget att se ut
          </p>

          {coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={coverImageAlt}
              className="mb-5 h-56 w-full rounded-xl bg-neutral-100 object-cover"
            />
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {title || "Namnlöst inlägg"}
          </h1>

          {excerpt.trim() && (
            <p className="mt-2 text-base text-neutral-600">{excerpt}</p>
          )}

          {body.trim() ? (
            <div
              className="rte-preview mt-5"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }}
            />
          ) : (
            <p className="mt-5 text-sm text-neutral-400">
              Inlägget har ingen brödtext ännu.
            </p>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="published"
          checked={published}
          onChange={(event) => setPublished(event.target.checked)}
          className="h-4 w-4 rounded border-neutral-300"
        />
        Publicerad (syns på den publika sajten)
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Spara
        </button>
        {!published && (
          <span className="text-sm text-neutral-500">
            Sparas som utkast — syns inte på sajten.
          </span>
        )}
      </div>
    </form>
  );
}
