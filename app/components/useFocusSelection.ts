'use client';

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { GridFocus } from '@/types/ads';
import type { GridBlock } from '@/app/lib/db';

/**
 * Link /?x=&y=: seleciona uma vez o bloco livre perto do foco, se o visitante ainda nao selecionou nada.
 * Se a grade chegar depois e o bloco colidir, o PixelCanvas ja realoca a selecao para o livre mais proximo.
 */
export function useFocusSelection<T>(
  focus: GridFocus | undefined,
  blocks: GridBlock[],
  selectedRef: MutableRefObject<T | null>,
  selectNear: (focus: GridFocus, blocks: GridBlock[]) => void
): void {
  const doneRef = useRef(false);
  useEffect(() => {
    if (!focus || doneRef.current) return;
    doneRef.current = true;
    if (selectedRef.current) return;
    selectNear(focus, blocks);
  }, [focus, blocks, selectedRef, selectNear]);
}
