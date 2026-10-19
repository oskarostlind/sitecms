"use client";

import { useEffect } from "react";

/**
 * Renderas på sidor som visar en engångshemlighet. Ber servern radera
 * cookien direkt, så att en omladdning eller bakåtnavigering inte visar
 * hemligheten igen.
 */
export function ConsumeReveal() {
  useEffect(() => {
    void fetch("/admin/reveal/consume", { method: "POST", credentials: "same-origin", cache: "no-store" }).catch(
      () => undefined,
    );
  }, []);
  return null;
}
