"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, PenLine } from "lucide-react";
import { slugify } from "./slugify";
import ImageField from "@/components/admin/ImageField";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { markdownToHtml } from "@/lib/markdown";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  SubmitButton,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  fieldIds,
} from "@/components/ui";

type PostFormPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  coverImage: string | null;
  coverImageAlt: string | null;
  published: boolean;
  publishedAt?: Date | string | null;
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
 *
 * Formuläret har exakt en submit-knapp ("Spara"); E2E-skripten klickar på
 * `form:has(input[name=title]) button[type=submit]`.
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
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Utgångsläget att jämföra mot för "Osparade ändringar".
  const initial = useRef({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    body: post?.body ?? "",
    coverImage: post?.coverImage ?? "",
    coverImageAlt: post?.coverImageAlt ?? "",
    published: post?.published ?? false,
  });
  const submitting = useRef(false);

  const start = initial.current;
  const dirty =
    title !== start.title ||
    slug !== start.slug ||
    excerpt !== start.excerpt ||
    body !== start.body ||
    coverImage !== start.coverImage ||
    coverImageAlt !== start.coverImageAlt ||
    published !== start.published;

  // Varna innan man lämnar sidan med osparade ändringar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      if (submitting.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const slugHint = fieldIds("slug").hintId;
  const excerptHint = fieldIds("excerpt").hintId;

  return (
    <form
      action={action}
      onSubmit={() => {
        submitting.current = true;
      }}
    >
      <input type="hidden" name="siteId" value={siteId} />
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      {/* Fälten nedan styrs av editorn/bildfältet och skickas med som dolda fält. */}
      <input type="hidden" name="body" value={body} />
      <input type="hidden" name="coverImage" value={coverImage} />
      <input type="hidden" name="coverImageAlt" value={coverImageAlt} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Huvudkolumn: text */}
        <Card className="min-w-0">
          <CardContent className="pt-3 sm:pt-4">
            <Tabs value={tab} onValueChange={(next) => setTab(next === "preview" ? "preview" : "write")}>
              <TabList aria-label="Redigera eller förhandsgranska">
                <Tab value="write">
                  <PenLine aria-hidden className="size-4" />
                  Skriv
                </Tab>
                <Tab value="preview">
                  <Eye aria-hidden className="size-4" />
                  Förhandsgranska
                </Tab>
              </TabList>

              {/* keepMounted: fälten måste finnas kvar i formuläret även när förhandsgranskningen visas. */}
              <TabPanel value="write" keepMounted className="space-y-5 pt-5">
                <Field htmlFor="title" label="Titel" required>
                  <Input
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
                  />
                </Field>

                <Field
                  htmlFor="slug"
                  label="Webbadress"
                  hint="Skapas automatiskt från titeln, men du kan ändra den. Använd små bokstäver och bindestreck."
                >
                  <div className="flex items-stretch">
                    <span
                      aria-hidden
                      className="inline-flex items-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 px-3 font-mono text-sm text-neutral-500"
                    >
                      …/
                    </span>
                    <Input
                      id="slug"
                      name="slug"
                      type="text"
                      value={slug}
                      onChange={(event) => {
                        setSlug(event.target.value);
                        setSlugTouched(true);
                      }}
                      placeholder="genereras-fran-titeln"
                      aria-describedby={slugHint}
                      className="rounded-l-none font-mono"
                    />
                  </div>
                </Field>

                <Field
                  htmlFor="excerpt"
                  label="Utdrag"
                  hint="En eller två meningar som visas i listor och när inlägget delas."
                >
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    rows={2}
                    value={excerpt}
                    onChange={(event) => setExcerpt(event.target.value)}
                    placeholder="Kort sammanfattning av inlägget"
                    aria-describedby={excerptHint}
                  />
                </Field>

                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-neutral-800">Brödtext</span>
                  <RichTextEditor
                    value={body}
                    onChange={setBody}
                    ariaLabel="Brödtext"
                    placeholder="Skriv inlägget här. Markera text och klicka på Fet eller Rubrik för att formatera."
                    minHeight={260}
                  />
                </div>
              </TabPanel>

              <TabPanel value="preview" className="pt-5">
                <p className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-500">
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

                {excerpt.trim() && <p className="mt-2 text-base text-neutral-600">{excerpt}</p>}

                {body.trim() ? (
                  <div className="rte-preview mt-5" dangerouslySetInnerHTML={{ __html: markdownToHtml(body) }} />
                ) : (
                  <p className="mt-5 text-sm text-neutral-500">Inlägget har ingen brödtext ännu.</p>
                )}
              </TabPanel>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sidokolumn: publicering + omslagsbild */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              actions={
                <Badge tone={published ? "success" : "neutral"} dot>
                  {published ? "Publicerad" : "Utkast"}
                </Badge>
              }
            >
              <CardTitle>Publicering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Checkbox
                id="published"
                name="published"
                checked={published}
                onChange={(event) => setPublished(event.target.checked)}
                label="Publicerad"
                description="Syns på den publika sajten när du sparar."
              />
              <p className="text-xs text-neutral-500">Opublicerade inlägg syns bara här i panelen.</p>
              {post?.publishedAt ? (
                <p className="text-xs text-neutral-500">Publicerad {formatDate(post.publishedAt)}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Omslagsbild</CardTitle>
              <CardDescription>Visas överst i inlägget och i listor.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageField
                siteId={siteId}
                value={coverImage}
                alt={coverImageAlt}
                onChange={(next) => {
                  setCoverImage(next.value);
                  setCoverImageAlt(next.alt);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sparrad – sticky inuti <main>, aldrig fixed över sidomenyn. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className={cn("size-2 rounded-full", dirty ? "bg-amber-500" : "bg-neutral-300")}
            />
            <span className={dirty ? "font-medium text-amber-800" : "text-neutral-500"}>
              {dirty ? "Osparade ändringar" : "Inga osparade ändringar"}
            </span>
            {!published ? (
              <span className="hidden text-neutral-500 sm:inline">· sparas som utkast</span>
            ) : null}
          </p>
          <SubmitButton pendingText="Sparar…">Spara</SubmitButton>
        </div>
      </div>
    </form>
  );
}
