import type { Metadata } from 'next';
import Link from 'next/link';
import LogoPreview from '@/app/components/LogoPreview';
import { parseFocus } from '@/app/lib/focus';

export const metadata: Metadata = {
  title: { absolute: 'Veja seu logo na grade | Manda Pixel' },
  description:
    'Escolha a imagem do seu logo, um lugar e um tamanho, e veja como ele fica na grade do Manda Pixel antes de comprar.',
  alternates: { canonical: '/previa' },
};

const DEFAULT_FOCUS = { x: 500, y: 500 };

type PreviaProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function PreviaPage({ searchParams }: PreviaProps) {
  const focus = parseFocus(searchParams.x, searchParams.y) ?? DEFAULT_FOCUS;
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <Link
        href="/"
        className="text-sm font-semibold text-brand-purple underline underline-offset-2 hover:text-brand-purpleDark"
      >
        Voltar para a grade
      </Link>
      <h1 className="mt-4 font-pixel text-2xl leading-tight text-stone-950 text-balance sm:text-3xl">
        Veja seu logo na grade
      </h1>
      <p className="mt-2 max-w-2xl text-stone-800 text-pretty">
        Escolha a imagem, o lugar e o tamanho. A prévia usa a grade de verdade, com os anúncios que já estão lá, e
        você pode baixar a imagem pra mostrar pra alguém antes de comprar.
      </p>
      <div className="mt-6">
        <LogoPreview initialX={focus.x} initialY={focus.y} />
      </div>
    </main>
  );
}
