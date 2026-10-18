import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Landningssidans rymd i statisk form: navy-gradient + stjärnor (ren CSS,
 * ingen WebGL) och valfri stillbild av planeten. Lägg den som första barn i
 * en `relative overflow-hidden`-container; innehållet ovanpå behöver `relative`.
 */
export function SpaceBackdrop({
  planet = "none",
  className,
}: {
  /** Var planeten ska synas: utanför bild nere till höger, centrerad bakom, eller ingen. */
  planet?: "corner" | "center" | "none";
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-space-950", className)}>
      <div className="sc-space-gradient absolute inset-0" />
      <div className="sc-stars absolute inset-0" />
      <div className="sc-stars sc-stars--far absolute inset-0" />
      {planet === "corner" ? (
        <Image
          src="/planet/planet-still.webp"
          alt=""
          width={960}
          height={960}
          priority={false}
          className="absolute -bottom-[45%] -right-[18%] w-[min(70vw,720px)] max-w-none opacity-90 [mask-image:radial-gradient(circle_at_center,black_55%,transparent_72%)]"
        />
      ) : null}
      {planet === "center" ? (
        <Image
          src="/planet/planet-still.webp"
          alt=""
          width={960}
          height={960}
          className="absolute left-1/2 top-1/2 w-[min(110vw,900px)] max-w-none -translate-x-1/2 -translate-y-[38%] opacity-80 [mask-image:radial-gradient(circle_at_center,black_55%,transparent_72%)]"
        />
      ) : null}
    </div>
  );
}
