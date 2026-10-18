"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scroll + staggered reveal för [data-reveal].
 * Under prefers-reduced-motion hoppas Lenis över och allt visas direkt.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    /* ---- Reveal ---- */
    let io: IntersectionObserver | null = null;
    if (reducedMotion || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
    } else {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
      );
      els.forEach((el) => io!.observe(el));
    }

    /* ---- Lenis ---- */
    let lenis: Lenis | null = null;
    let raf = 0;
    if (!reducedMotion) {
      try {
        lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.5 });
        const loop = (t: number) => {
          lenis?.raf(t);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (err) {
        console.warn("[landning] Lenis kunde inte starta", err);
        lenis = null;
      }
    }

    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
