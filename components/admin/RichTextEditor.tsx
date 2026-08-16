"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { markdownToHtml, richDocToMarkdown } from "@/lib/markdown";

/**
 * WYSIWYG-editor för brödtext (inlägg och richtext-block).
 *
 * Kunden markerar text och klickar "Fet" — ingen markdown-syntax behöver
 * läras in. Innehållet lagras fortfarande som markdown (se lib/markdown.ts),
 * så databasen, API:t och kundsajterna är oförändrade.
 *
 * Verktygsraden speglar exakt den delmängd av markdown som lib/markdown.ts
 * kan läsa tillbaka. Lägg aldrig till en knapp här utan att samtidigt lära
 * markdown-bryggan att hantera formatet — då tappas formateringen vid nästa
 * inläsning.
 */

type RichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeight?: number;
  ariaLabel?: string;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
};

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
  wide = false,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      // onMouseDown hindrar att editorn tappar markeringen när knappen klickas.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 items-center justify-center rounded-md text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        wide ? "px-2.5" : "w-8"
      } ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden="true" />;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Skriv här…",
  minHeight = 160,
  ariaLabel,
}: RichTextEditorProps) {
  // Senaste markdown vi själva skickade uppåt. Används för att skilja
  // "föräldern gav oss nytt innehåll" från "det här är vår egen ändring på
  // väg tillbaka" — annars skulle varje tangenttryck återställa markören.
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    // immediatelyRender: false krävs för server-rendering i Next.
    immediatelyRender: false,
    // Rita om vid varje transaktion så att verktygsradens markeringar
    // (fet/rubrik/lista) speglar var markören står.
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        // Format som markdown-bryggan inte läser tillbaka stängs av, så att
        // editorn aldrig kan skapa något som tappas vid sparning.
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate({ editor: instance }) {
      const markdown = richDocToMarkdown(instance.getJSON());
      lastEmitted.current = markdown;
      onChangeRef.current(markdown);
    },
  });

  // Innehåll som kommer utifrån (t.ex. efter en ångra-åtgärd) skrivs in i
  // editorn; våra egna ändringar hoppas över.
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  const openLinkEditor = useCallback(() => {
    if (!editor) return;
    setLinkValue((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkOpen(true);
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = linkValue.trim();

    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const withProtocol = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href)
        ? href
        : `https://${href}`;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: withProtocol })
        .run();
    }

    setLinkOpen(false);
    setLinkValue("");
  }, [editor, linkValue]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkValue("");
  }, [editor]);

  if (!editor) {
    // Server-render och första klientrender: en tom ruta i samma storlek, så
    // att layouten inte hoppar när editorn monteras.
    return (
      <div
        className="rounded-xl border border-neutral-200 bg-white"
        style={{ minHeight: minHeight + 45 }}
      />
    );
  }

  // Läses om vid varje transaktion (shouldRerenderOnTransaction ovan).
  const state = {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    heading2: editor.isActive("heading", { level: 2 }),
    heading3: editor.isActive("heading", { level: 3 }),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-300">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <ToolbarButton
          title="Fet text (Ctrl+B)"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">F</span>
        </ToolbarButton>
        <ToolbarButton
          title="Kursiv text (Ctrl+I)"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="font-serif italic">K</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Rubrik"
          wide
          active={state.heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Rubrik
        </ToolbarButton>
        <ToolbarButton
          title="Underrubrik"
          wide
          active={state.heading3}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="text-xs">Underrubrik</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Punktlista"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <circle cx="4" cy="5" r="1.5" />
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="4" cy="15" r="1.5" />
            <rect x="8" y="4" width="9" height="2" rx="1" />
            <rect x="8" y="9" width="9" height="2" rx="1" />
            <rect x="8" y="14" width="9" height="2" rx="1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Numrerad lista"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true">
            <text x="1" y="7" fontSize="6">1</text>
            <text x="1" y="12.5" fontSize="6">2</text>
            <text x="1" y="18" fontSize="6">3</text>
            <rect x="8" y="4" width="9" height="2" rx="1" />
            <rect x="8" y="9" width="9" height="2" rx="1" />
            <rect x="8" y="14" width="9" height="2" rx="1" />
          </svg>
        </ToolbarButton>
        <ToolbarButton
          title="Citat"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <span className="text-base leading-none">&rdquo;</span>
        </ToolbarButton>

        <Divider />

        <ToolbarButton title="Länk" active={state.link || linkOpen} onClick={openLinkEditor}>
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-1 1" strokeLinecap="round" />
            <path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l1-1" strokeLinecap="round" />
          </svg>
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            title="Ångra (Ctrl+Z)"
            disabled={!state.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M7 8H12.5a3.5 3.5 0 0 1 0 7H9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m9.5 5.5-3 2.5 3 2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ToolbarButton>
          <ToolbarButton
            title="Gör om (Ctrl+Shift+Z)"
            disabled={!state.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M13 8H7.5a3.5 3.5 0 0 0 0 7H11" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m10.5 5.5 3 2.5-3 2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ToolbarButton>
        </div>
      </div>

      {linkOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-3 py-2">
          <input
            type="text"
            autoFocus
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
              }
            }}
            placeholder="jjbyggboden.se eller https://…"
            className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Spara länk
          </button>
          {state.link && (
            <button
              type="button"
              onClick={removeLink}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Ta bort länk
            </button>
          )}
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="rounded-lg px-2 py-1.5 text-sm text-neutral-500 hover:text-neutral-800"
          >
            Avbryt
          </button>
        </div>
      )}

      <div
        className="cursor-text px-3 py-2"
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
