"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { undoActivity } from "@/lib/actions/undo";

/**
 * "Ångra" i aktivitetsloggen. Återställer innehållet till ögonblicksbilden
 * som sparades när ändringen gjordes. Bekräftar först — det här skriver om
 * innehåll på en skarp sajt — och laddar om listan efteråt så att raden
 * visas som ångrad.
 */
export default function UndoActivityButton({ logId }: { logId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      "Ångra den här ändringen? Innehållet återställs till hur det såg ut innan."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await undoActivity(logId);

      if (!result.ok) {
        toast({ title: "Kunde inte ångra", description: result.error, tone: "danger" });
        return;
      }

      toast({ title: "Ändringen ångrades", description: result.detail, tone: "success" });
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" size="sm" icon={<Undo2 />} loading={isPending} onClick={handleClick}>
      Ångra
    </Button>
  );
}
