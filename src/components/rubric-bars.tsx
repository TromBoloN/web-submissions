import { cn } from "cn";

export type RubricBarItem = {
  id: string;
  label: string;
  score: number | null;
  weight?: number;
};

type RubricBarsProps = {
  items: readonly RubricBarItem[];
  className?: string;
};

function formatScore(score: number | null) {
  if (score === null || Number.isNaN(score)) return "-";

  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);
}

export function RubricBars({ items, className }: RubricBarsProps) {
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => {
        const value = item.score === null ? 0 : Math.min(Math.max(item.score, 0), 100);

        return (
          <li key={item.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">{item.label}</span>
              <span className="shrink-0 font-semibold text-foreground tabular-nums">
                {formatScore(item.score)}
                {item.weight !== undefined && (
                  <span className="ml-1 font-normal text-muted-foreground">({item.weight}%)</span>
                )}
              </span>
            </div>
            <div
              aria-label={`${item.label}: ${formatScore(item.score)} dari 100`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={item.score ?? undefined}
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
