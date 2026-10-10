import { useMemo, useState } from 'react';

/**
 * Grouped column chart (time on x, one shared y scale). Follows the data-viz
 * specs: columns ≤ 24px with a 4px rounded data-end, 2px surface gap between
 * neighbours, hairline grid, legend for 2+ series, hover/focus tooltip per
 * group and a table view so no value is colour- or hover-only.
 *
 * Series colours must come from CHART_COLORS (validated for colour blindness).
 */

/** Validated categorical slots (light surface, adjacent CVD ΔE ≥ 20). */
export const CHART_COLORS = {
  blue: '#2a78d6',
  forest: '#2f7f55'
} as const;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ColumnDatum {
  label: string;
  values: Record<string, number>;
}

interface ColumnChartProps {
  title: string;
  series: ChartSeries[];
  data: ColumnDatum[];
  format?: (value: number) => string;
  height?: number;
}

const niceMax = (value: number): number => {
  if (value <= 0) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exponent >= value / 4) ?? 10;
  return Math.ceil(value / (step * exponent)) * step * exponent;
};

function ColumnChart({ title, series, data, format = (v) => v.toLocaleString(), height = 168 }: ColumnChartProps): JSX.Element {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = useMemo(
    () => niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d.values[s.key] ?? 0)))),
    [data, series]
  );
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <figure className="m-0">
      <div className="flex items-center justify-between gap-3 mb-3">
        <figcaption className="text-[14px] font-semibold text-olive-950">{title}</figcaption>
        <div className="flex items-center gap-3">
          {series.length > 1 &&
            series.map((s) => (
              <span className="inline-flex items-center gap-1.5 text-xs text-olive-600" key={s.key}>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
            ))}
          <button className="text-xs text-olive-500 hover:text-olive-900 underline-offset-2 hover:underline" onClick={() => setAsTable((t) => !t)} type="button">
            {asTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>

      {asTable ? (
        <div className="overflow-x-auto rounded-lg border border-olive-200 max-h-[220px]">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-olive-50 text-xs text-olive-500">
                <th className="h-8 px-3 text-left font-medium">Period</th>
                {series.map((s) => <th className="h-8 px-3 text-right font-medium" key={s.key}>{s.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr className="border-t border-olive-100" key={d.label}>
                  <td className="px-3 py-1.5 text-olive-700">{d.label}</td>
                  {series.map((s) => <td className="px-3 py-1.5 text-right tabular-nums text-olive-950" key={s.key}>{format(d.values[s.key] ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* y axis */}
          <div className="relative w-9 shrink-0 text-[11px] text-olive-400 tabular-nums" style={{ height }}>
            {ticks.map((t) => (
              <span className="absolute right-0 -translate-y-1/2" key={t} style={{ top: `${100 - (t / max) * 100}%` }}>
                {format(t)}
              </span>
            ))}
          </div>
          <div className="relative flex-1 min-w-0">
            {/* hairline grid */}
            <div className="absolute inset-x-0 top-0" style={{ height }}>
              {ticks.map((t) => (
                <div className="absolute inset-x-0 h-px bg-olive-100" key={t} style={{ top: `${100 - (t / max) * 100}%` }} />
              ))}
            </div>
            <div className="relative flex items-end" style={{ height }}>
              {data.map((d, i) => (
                <div
                  aria-label={`${d.label}: ${series.map((s) => `${s.label} ${format(d.values[s.key] ?? 0)}`).join(', ')}`}
                  className="relative flex-1 h-full flex items-end justify-center gap-[2px] outline-none focus-visible:bg-olive-50"
                  key={d.label}
                  onBlur={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                  role="img"
                  tabIndex={0}
                >
                  {hover === i && <div className="absolute inset-y-0 inset-x-[2px] bg-olive-50 rounded" />}
                  {series.map((s) => {
                    const value = d.values[s.key] ?? 0;
                    return (
                      <div
                        className="relative w-full max-w-[24px] rounded-t-[4px]"
                        key={s.key}
                        style={{ height: `${(value / max) * 100}%`, minHeight: value > 0 ? 2 : 0, backgroundColor: s.color }}
                      />
                    );
                  })}
                  {hover === i && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 min-w-[120px] rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-olive-950/10 pointer-events-none">
                      <div className="text-[11px] text-olive-500 mb-1 whitespace-nowrap">{d.label}</div>
                      {series.map((s) => (
                        <div className="flex items-center gap-2 text-[12px] whitespace-nowrap" key={s.key}>
                          <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
                          <strong className="tabular-nums text-olive-950">{format(d.values[s.key] ?? 0)}</strong>
                          <span className="text-olive-500">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* x axis: first, middle and last labels only */}
            <div className="relative h-5 mt-1 text-[11px] text-olive-400">
              {data.map((d, i) =>
                i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2) ? (
                  <span
                    className="absolute -translate-x-1/2 whitespace-nowrap"
                    key={d.label}
                    style={{ left: `${((i + 0.5) / data.length) * 100}%` }}
                  >
                    {d.label}
                  </span>
                ) : null
              )}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}

export default ColumnChart;
