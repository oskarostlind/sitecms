"use client";

import { useState } from "react";
import { slugify } from "./slugify";

type PostFormPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImage: string | null;
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
 */
export function PostForm({ siteId, action, post = null }: PostFormProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));

  const inputClassName =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="siteId" value={siteId} />
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}

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
          defaultValue={post?.excerpt ?? ""}
          placeholder="Kort sammanfattning som visas i listor"
          className={inputClassName}
        />
      </div>

      <div>
        <label htmlFor="body" className="block text-sm font-medium text-neutral-700">
          Brödtext (markdown)
        </label>
        <textarea
          id="body"
          name="body"
          rows={14}
          defaultValue={post?.body ?? ""}
          placeholder={"Skriv inlägget här. Du kan använda markdown, t.ex. **fet text** och ## Rubrik."}
          className={`${inputClassName} font-mono`}
        />
      </div>

      <div>
        <label htmlFor="coverImage" className="block text-sm font-medium text-neutral-700">
          Omslagsbild (URL)
        </label>
        <input
          id="coverImage"
          name="coverImage"
          type="text"
          defaultValue={post?.coverImage ?? ""}
          placeholder="https://..."
          className={inputClassName}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          name="published"
          defaultChecked={post?.published ?? false}
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
      </div>
    </form>
  );
}
