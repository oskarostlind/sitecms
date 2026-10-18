"use client";

import { useEffect, useRef } from "react";

/**
 * Fixerad, helskärms WebGL-planet bakom landningssidan.
 *
 * three.js laddas dynamiskt inuti useEffect, så inget av det körs på servern
 * och det hamnar i en egen chunk som inte blockerar första målningen. Om WebGL
 * saknas eller något går fel syns bara sidans bakgrundsfärg – sidan kraschar
 * aldrig.
 */
export default function PlanetScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      canvas.style.visibility = "hidden";
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    import("./planet-scene")
      .then(({ createPlanetScene }) => {
        if (cancelled) return;
        try {
          cleanup = createPlanetScene(canvas, { reducedMotion });
        } catch (err) {
          console.warn("[planet] WebGL är inte tillgängligt – visar bara bakgrunden", err);
          canvas.style.visibility = "hidden";
        }
      })
      .catch((err) => {
        console.warn("[planet] kunde inte ladda scenen", err);
        canvas.style.visibility = "hidden";
      });

    return () => {
      cancelled = true;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      try {
        cleanup?.();
      } catch {
        /* ignorera fel vid nedmontering */
      }
      cleanup = null;
    };
  }, []);

  return <canvas ref={canvasRef} className="planet-canvas" aria-hidden="true" />;
}
