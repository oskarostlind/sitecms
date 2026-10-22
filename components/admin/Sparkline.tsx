import { cn } from "@/lib/cn";

export type SparklineProps = {
  /** Ett värde per dag, i tidsordning. Tom array eller bara nollor ritar en platt linje. */
  points: number[];
  className?: string;
  /** Beskrivning för skärmläsare, t.ex. "Besökare per dag, 7 dagar". */
  ariaLabel: string;
};

const WIDTH = 100;
const HEIGHT = 32;
const PAD = 2;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Liten trendlinje som inline-SVG (serverkomponent, ingen lib). Fyller sin
 * behållare (`preserveAspectRatio="none"`); sätt storlek med `className`,
 * t.ex. `h-8 w-full`. Fylld yta under linjen i brand-färg.
 */
export function Sparkline({ points, className, ariaLabel }: SparklineProps) {
  const values = points.filter((v) => Number.isFinite(v)).map((v) => Math.max(0, v));
  const count = values.length;
  const max = count > 0 ? Math.max(...values) : 0;
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  const floor = HEIGHT - PAD;

  let coords: [number, number][];
  if (count === 0) {
    // Ingen data → platt linje längst ned.
    coords = [
      [PAD, floor],
      [WIDTH - PAD, floor],
    ];
  } else if (count === 1) {
    // En punkt → platt linje på punktens nivå.
    const y = max > 0 ? PAD : floor;
    coords = [
      [PAD, y],
      [WIDTH - PAD, y],
    ];
  } else {
    coords = values.map((v, i) => {
      const x = PAD + (i / (count - 1)) * innerW;
      const y = max > 0 ? PAD + innerH - (v / max) * innerH : floor;
      return [round(x), round(y)];
    });
  }

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0]},${floor} L${coords[0][0]},${floor} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={cn("block text-brand-600", className)}
    >
      <path d={area} fill="currentColor" fillOpacity={0.12} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
