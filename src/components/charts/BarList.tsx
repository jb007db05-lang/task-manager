import { CHART_COLORS } from './ColumnChart';

export interface BarListRow {
  key: string;
  label: string;
  value: number;
  hint?: string;
}

interface BarListProps {
  rows: BarListRow[];
  format?: (value: number) => string;
  /** Bars are drawn relative to this; defaults to the largest value. */
  total?: number;
  empty?: string;
}

/**
 * Ranked horizontal bars for one measure (hours per task, tasks per status).
 * Single series, so no legend: the label and value sit beside every bar.
 */
function BarList({ rows, format = (v) => v.toLocaleString(), total, empty = 'Nothing to show yet.' }: BarListProps): JSX.Element {
  if (rows.length === 0) return <p className="m-0 text-[13px] text-olive-500">{empty}</p>;
  const scale = total ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="m-0 p-0 list-none grid gap-2.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-olive-800">{row.label}</span>
            <span className="tabular-nums font-medium text-olive-950">{format(row.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-olive-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${scale ? Math.min(100, (row.value / scale) * 100) : 0}%`, backgroundColor: CHART_COLORS.forest }}
            />
          </div>
          {row.hint && <div className="mt-0.5 text-[11px] text-olive-500">{row.hint}</div>}
        </li>
      ))}
    </ul>
  );
}

export default BarList;
