import { pixelsLabel, priceLabel } from '@/app/lib/logo-preview';
import type { PreviewRect } from '@/types/preview';

type PreviewMapInfoProps = {
  rect: PreviewRect;
  free: boolean;
};

/** Dados do lugar escolhido, em texto, logo abaixo do mapa. */
export default function PreviewMapInfo({ rect, free }: PreviewMapInfoProps) {
  const pixels = rect.w * rect.h;
  return (
    <dl className="mx-auto mt-3 grid max-w-[560px] grid-cols-2 gap-x-4 gap-y-2 text-sm text-stone-900 tabular-nums sm:grid-cols-4">
      <div>
        <dt className="text-stone-600">Tamanho</dt>
        <dd className="font-semibold">
          {rect.w}x{rect.h} = {pixelsLabel(pixels)} pixels
        </dd>
      </div>
      <div>
        <dt className="text-stone-600">Preço</dt>
        <dd className="font-semibold">{priceLabel(pixels)}</dd>
      </div>
      <div>
        <dt className="text-stone-600">Posição</dt>
        <dd className="font-semibold">
          {rect.x}, {rect.y}
        </dd>
      </div>
      <div>
        <dt className="text-stone-600">Lugar</dt>
        <dd className={free ? 'font-semibold text-green-800' : 'font-semibold text-red-700'}>
          {free ? 'Livre' : 'Ocupado'}
        </dd>
      </div>
    </dl>
  );
}
