import type { Metadata } from "next";
import { GoalProgress, StatCard } from "@/app/components/PainelParts";
import { GOAL_BRL, SITE_URL, TOTAL_PIXELS } from "@/app/lib/constants";
import { getPainelStats } from "@/app/lib/painel";
import { getOnlineCount } from "@/app/lib/presence";

// Le o SQLite a cada acesso; nao pode ser pre-renderizada no build.
export const dynamic = "force-dynamic";

const integer = new Intl.NumberFormat("pt-BR");
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlWhole = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function formatPct(pct: number): string {
  const digits = pct > 0 && pct < 1 ? 4 : 2;
  return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(pct)}%`;
}

const SECONDARY_LINKS = [
  { href: "/diario", label: "Diário" },
  { href: "/time", label: "Time" },
  { href: "/termos", label: "Termos" },
] as const;

export function generateMetadata(): Metadata {
  const { soldPixels, pct } = getPainelStats();
  return {
    title: { absolute: "Painel | Manda Pixel" },
    description: `${integer.format(soldPixels)} de ${integer.format(TOTAL_PIXELS)} pixels vendidos (${formatPct(pct)} da meta de ${brlWhole.format(GOAL_BRL)}).`,
    alternates: { canonical: `${SITE_URL}/painel` },
  };
}

export default function PainelPage() {
  const stats = getPainelStats();
  const online = getOnlineCount();

  return (
    <div className="min-h-dvh bg-[#FCD953]/20 text-stone-900">
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <a href="/" className="inline-flex items-center gap-2 font-bold text-purple-950">
          <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
          <span>Manda Pixel</span>
        </a>

        <h1 className="mt-8 text-4xl font-bold text-balance text-[#6A3378]">Painel</h1>
        <p className="mt-2 text-pretty text-stone-700">Os números do experimento, atualizados a cada acesso.</p>

        <dl className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Pixels vendidos"
            value={integer.format(stats.soldPixels)}
            detail={`de ${integer.format(TOTAL_PIXELS)}`}
          />
          <StatCard label="Receita" value={brl.format(stats.revenueBRL)} detail="pagamentos confirmados" />
          <StatCard label="Anúncios no ar" value={integer.format(stats.liveAds)} detail="publicados na grade" />
          <StatCard label="Online agora" value={integer.format(online)} detail="aproximado" />
        </dl>

        <div className="mt-6">
          <GoalProgress
            pct={stats.pct}
            pctLabel={formatPct(stats.pct)}
            revenueLabel={brl.format(stats.revenueBRL)}
            goalLabel={brlWhole.format(stats.goalBRL)}
          />
        </div>

        <p className="mt-6 text-pretty text-stone-800">
          Meta: R$ 1.000.000 até 15/10/2027. Cada pixel custa R$ 1.
        </p>

        <nav aria-label="Links do site" className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold">
          <a
            href="/"
            className="inline-flex items-center rounded-xl bg-[#6A3378] px-4 py-2.5 text-base font-bold text-white hover:bg-purple-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A3378]"
          >
            Ver a grade
          </a>
          {SECONDARY_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[#6A3378] underline-offset-4 hover:underline">
              {link.label}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}
