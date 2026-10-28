'use client';

import { useEffect, useState } from 'react';
import type { ExperimentStatus } from '@/types/experiment';
import { experimentStatus } from '../lib/experiment.ts';
import { EXPERIMENT_DAYS, EXPERIMENT_START } from '../lib/constants.ts';

/** Atualiza o dia sem precisar recarregar a página aberta virando a meia-noite. */
const REFRESH_MS = 60 * 1000;

function startDayMonth(): string {
  const [, month, day] = EXPERIMENT_START.split('-');
  return `${day}/${month}`;
}

function statusText(status: ExperimentStatus): string {
  if (!status.started) return `Experimento de 1 ano começa em ${startDayMonth()}`;
  if (status.ended) return 'Experimento encerrado';
  return `Dia ${status.day} de ${EXPERIMENT_DAYS} do experimento`;
}

/** Linha do placar com o dia do experimento. Calculada só no cliente para não divergir da hidratação. */
export default function ExperimentDay() {
  const [status, setStatus] = useState<ExperimentStatus | null>(null);

  useEffect(() => {
    const update = () => setStatus(experimentStatus(new Date()));
    update();
    const timer = window.setInterval(update, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (status === null) return <span className="block h-3.5" aria-hidden="true" />;

  return (
    <a
      href="/diario"
      className="block h-3.5 whitespace-nowrap text-[10px] leading-[14px] font-bold text-stone-800 hover:text-purple-900 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-purple-800 rounded-sm underline-offset-2"
    >
      {statusText(status)}
    </a>
  );
}
