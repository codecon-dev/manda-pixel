import type { ExperimentStatus } from '../../types/experiment.ts';
import { EXPERIMENT_START } from './constants.ts';

/** São Paulo sem horário de verão: UTC-3 fixo, independente do fuso da máquina. */
const SAO_PAULO_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const START_INSTANT_MS = Date.parse(`${EXPERIMENT_START}T00:00:00-03:00`);
const pixelFormatter = new Intl.NumberFormat('pt-BR');

/** Número do dia de calendário em São Paulo (dias desde 1970-01-01). */
function saoPauloDayNumber(ms: number): number {
  return Math.floor((ms + SAO_PAULO_OFFSET_MS) / DAY_MS);
}

export function experimentStatus(now: Date): ExperimentStatus {
  const nowMs = now.getTime();
  const dayDiff = saoPauloDayNumber(nowMs) - saoPauloDayNumber(START_INSTANT_MS);
  if (nowMs < START_INSTANT_MS) return { started: false, daysToStart: -dayDiff };
  return { started: true, day: dayDiff + 1 };
}

export function formatPixels(n: number): string {
  return pixelFormatter.format(n);
}
