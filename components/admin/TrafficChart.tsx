import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import type { DayPoint } from "@/lib/traffic";

export type TrafficChartProps = {
  /** En punkt per dag i tidsordning (luckor = 0), från `getTrafficSummary`. */
  series: DayPoint[];
  className?: string;
};

const WIDTH = 600;
const HEIGHT = 160;
const GAP_RATIO = 0.3;

const shortDay = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function parseDay(day: string): Date | null {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function labelShort(day: string) {
  const date = parseDay(day);
  return date ? shortDay.format(date).replace(".", "") : day;
}

function labelLong(day: string) {
  const date = parseDay(day);
  if (!date) return day;
  const text = longDay.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Vilka x-etiketter som visas: alla vid ≤ 10 dagar, annars ungefär var 5:e plus sista. */
function showLabel(index: number, count: number) {
  if (count <= 10) return true;
  const step = count <= 31 ? 5 : Math.ceil(count / 6);
  return index % step === 0 || index === count - 1;
}

/**
 * Stapeldiagram per dag som inline-SVG (serverkomponent, ingen lib). Ljus
 * stapel = sidvisningar, mörk stapel ovanpå = besökare. Varje stapel har en
 * `<title>` (hover) och hela serien finns som sr-only tabell. Etiketterna
 * ligger i HTML under diagrammet så att de aldrig förvrängs när SVG:n
 * sträcks till behållarens bredd.
 */
export function TrafficChart({ series, className }: TrafficChartProps) {
  const count = series.length;
  const max = Math.max(1, ...series.map((p) => Math.max(0, p.views, p.visitors)));
  const slot = count > 0 ? WIDTH / count : WIDTH;
  const gap = slot * GAP_RATIO;
  const barW = Math.max(1, slot - gap);

  return (
    <figure className={cn("min-w-0", className)}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden
          className="block h-40 w-full text-brand-600"
        >
          {/* Hjälplinjer: 50 % och baslinje */}
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT / 2}
            y2={HEIGHT / 2}
            stroke="currentColor"
            strokeOpacity={0.15}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
            className="text-neutral-500"
          />
          <line
            x1={0}
            x2={WIDTH}
            y1={HEIGHT - 0.5}
            y2={HEIGHT - 0.5}
            stroke="currentColor"
            strokeOpacity={0.3}
            vectorEffect="non-scaling-stroke"
            className="text-neutral-500"
          />
          {series.map((point, i) => {
            const x = i * slot + gap / 2;
            const viewsH = (Math.max(0, point.views) / max) * HEIGHT;
            const visitorsH = (Math.max(0, point.visitors) / max) * HEIGHT;
            return (
              <g key={point.day}>
                <title>
                  {`${labelLong(point.day)}: ${formatNumber(point.visitors)} besökare, ${formatNumber(point.views)} sidvisningar`}
                </title>
                {/* Osynlig träffyta för hover över hela kolumnen */}
                <rect x={i * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
                <rect
                  x={x}
                  y={HEIGHT - viewsH}
                  width={barW}
                  height={viewsH}
                  fill="currentColor"
                  fillOpacity={0.2}
                  rx={1.5}
                />
                <rect x={x} y={HEIGHT - visitorsH} width={barW} height={visitorsH} fill="currentColor" rx={1.5} />
              </g>
            );
          })}
        </svg>
        <span className="pointer-events-none absolute right-0 top-0 rounded bg-white/80 px-1 text-[11px] tabular-nums text-neutral-500">
          {formatNumber(max)}
        </span>
      </div>

      {count > 0 ? (
        <div
          aria-hidden
          className="mt-1.5 grid text-[11px] text-neutral-500"
          style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
        >
          {series.map((point, i) => (
            <span key={point.day} className="min-w-0 truncate text-center">
              {showLabel(i, count) ? labelShort(point.day) : ""}
            </span>
          ))}
        </div>
      ) : null}

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-brand-600" />
          Besökare
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-brand-600/20" />
          Sidvisningar
        </span>
      </figcaption>

      <table className="sr-only">
        <caption>Besökare och sidvisningar per dag</caption>
        <thead>
          <tr>
            <th scope="col">Dag</th>
            <th scope="col">Besökare</th>
            <th scope="col">Sidvisningar</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.day}>
              <th scope="row">{labelLong(point.day)}</th>
              <td>{formatNumber(point.visitors)}</td>
              <td>{formatNumber(point.views)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
