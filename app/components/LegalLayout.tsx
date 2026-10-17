import type { ReactNode } from "react";

type LegalLayoutProps = {
  title: string;
  updatedAt: string;
  children: ReactNode;
};

const FOOTER_LINKS = [
  { href: "/", label: "Início" },
  { href: "/termos", label: "Termos" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/diario", label: "Diário" },
  { href: "/time", label: "Time" },
] as const;

export default function LegalLayout({ title, updatedAt, children }: LegalLayoutProps) {
  return (
    <div className="min-h-dvh bg-white text-stone-900 flex flex-col">
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-prose px-5 py-4">
          <a href="/" className="inline-flex items-center gap-2 font-bold text-purple-950">
            <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
            <span>Manda Pixel</span>
          </a>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-prose px-5 py-10">
        <h1 className="text-3xl font-bold text-balance text-stone-950">{title}</h1>
        <p className="mt-2 text-sm text-stone-600">Atualizado em {updatedAt}</p>
        <div className="mt-8 space-y-6 text-base leading-relaxed text-pretty text-stone-800">
          {children}
        </div>
      </main>

      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-prose px-5 py-6">
          <nav aria-label="Links do site" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-stone-700">
            {FOOTER_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-purple-950 underline-offset-4 hover:underline">
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
