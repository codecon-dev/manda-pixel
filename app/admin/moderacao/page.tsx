import type { Metadata } from 'next';
import ModerationPanel from './ModerationPanel';

export const metadata: Metadata = {
  title: 'Moderação de Anúncios | Manda Pixel',
  description: 'Painel administrativo para moderação manual de anúncios em análise.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminModerationPage() {
  return (
    <main className="min-h-dvh bg-stone-950 text-stone-100 flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-6xl w-full mx-auto">
        <ModerationPanel />
      </div>

      <footer className="max-w-6xl w-full mx-auto mt-12 pt-6 border-t border-stone-800 text-xs text-stone-500 flex flex-wrap justify-between items-center gap-4">
        <p>Manda Pixel &copy; 2026 &bull; Painel de Moderação Manual</p>
        <div className="flex gap-4">
          <a
            href="/"
            className="hover:text-stone-300 transition-colors"
          >
            Grade Principal
          </a>
          <a
            href="/diario"
            className="hover:text-stone-300 transition-colors"
          >
            Diário de Bordo
          </a>
          <a
            href="/time"
            className="hover:text-stone-300 transition-colors"
          >
            Time
          </a>
          <a
            href="https://github.com/codecon-dev/manda-pixel"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-300 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
