type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
};

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl border-2 border-purple-950/10 bg-white p-4">
      <dt className="text-sm font-semibold text-stone-700">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-purple-950 break-words sm:text-3xl">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-stone-600">{detail}</dd> : null}
    </div>
  );
}

type GoalProgressProps = {
  pct: number;
  pctLabel: string;
  revenueLabel: string;
  goalLabel: string;
};

/** Largura minima visivel quando ja ha venda mas a % ainda arredonda para zero na tela. */
const MIN_VISIBLE_BAR_PX = 2;

export function GoalProgress({ pct, pctLabel, revenueLabel, goalLabel }: GoalProgressProps) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <section aria-labelledby="meta-titulo" className="rounded-xl bg-purple-950 p-5 text-white">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="meta-titulo" className="text-lg font-bold">
          Rumo a {goalLabel}
        </h2>
        <p className="text-2xl font-bold tabular-nums text-[#FCD953]">{pctLabel}</p>
      </div>
      <div
        role="progressbar"
        aria-label="Progresso até a meta"
        aria-valuenow={Number(width.toFixed(4))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${pctLabel} da meta`}
        className="mt-3 h-4 w-full overflow-hidden rounded-full bg-white/15"
      >
        <div
          className="h-full rounded-full bg-[#FCD953]"
          style={{ width: `${width}%`, minWidth: pct > 0 ? `${MIN_VISIBLE_BAR_PX}px` : 0 }}
        />
      </div>
      <p className="mt-2 text-sm tabular-nums text-purple-100">
        {revenueLabel} de {goalLabel}
      </p>
    </section>
  );
}
