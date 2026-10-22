"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui";
import { useLivePreviewPrefs } from "@/components/admin/live-preview-prefs";

/** "Förhandsgranska" i sidredigerarens sidhuvud. Läget kommer ihåg per webbläsare. */
export function PreviewToggleButton() {
  const [prefs, setPrefs] = useLivePreviewPrefs();
  return (
    <Button
      variant="secondary"
      icon={prefs.open ? <EyeOff /> : <Eye />}
      aria-pressed={prefs.open}
      onClick={() => setPrefs({ open: !prefs.open })}
    >
      {prefs.open ? "Stäng förhandsgranskning" : "Förhandsgranska"}
    </Button>
  );
}
