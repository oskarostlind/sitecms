"use client";

import { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Button, useToast } from "@/components/ui";

type AdminRevealSecretProps = {
  value: string;
  title?: string;
  description?: string;
  /**
   * "callout" (default): amber engångsruta med titel/beskrivning – för
   * hemligheter som bara visas en gång direkt efter att de skapats.
   * "inline": bara maskerat värde + Visa/Dölj + Kopiera, för att bäddas in
   * i t.ex. en tabellcell (redan sparade API-nycklar m.m.).
   */
  variant?: "callout" | "inline";
};

const MASK = "••••••••";

/**
 * Visar en hemlighet (API-nyckel, revalidate-hemlighet, tillfälligt
 * lösenord) maskerad som standard, med knappar för att visa/dölja och
 * kopiera. Hämtar eller lagrar inget själv – värdet kommer alltid in via
 * props (t.ex. den krypterade engångscookien, se lib/reveal-flash.ts).
 */
export function AdminRevealSecret({ value, title, description, variant = "callout" }: AdminRevealSecretProps) {
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Kopierad", tone: "success" });
    } catch {
      toast({ title: "Kunde inte kopiera", tone: "danger" });
    }
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <code className="break-all rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-900">
        {visible ? value : MASK}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={visible ? <EyeOff /> : <Eye />}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "Dölj" : "Visa"}
      </Button>
      <Button type="button" variant="ghost" size="sm" icon={<Copy />} onClick={handleCopy}>
        Kopiera
      </Button>
    </div>
  );

  if (variant === "inline") return controls;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {title ? <p className="font-medium">{title}</p> : null}
      {description ? <p className="mt-1 text-amber-800">{description}</p> : null}
      <div className="mt-3">{controls}</div>
      <p className="mt-2 text-xs text-amber-700">
        Detta visas bara en gång. Spara värdet nu — det går inte att visa igen senare.
      </p>
    </div>
  );
}
