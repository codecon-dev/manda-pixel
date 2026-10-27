import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentStatus, formatPixels } from '../app/lib/experiment.ts';

test('um minuto antes do início faltam 1 dia', () => {
  assert.deepEqual(experimentStatus(new Date('2026-10-31T23:59:00-03:00')), { started: false, daysToStart: 1 });
});

test('01/11 00:00 em SP é o dia 1', () => {
  assert.deepEqual(experimentStatus(new Date('2026-11-01T00:00:00-03:00')), { started: true, day: 1 });
});

test('02/11 12:00 em SP é o dia 2', () => {
  assert.deepEqual(experimentStatus(new Date('2026-11-02T12:00:00-03:00')), { started: true, day: 2 });
});

test('26/10 12:00 em SP faltam 6 dias', () => {
  assert.deepEqual(experimentStatus(new Date('2026-10-26T12:00:00-03:00')), { started: false, daysToStart: 6 });
});

test('formatPixels usa separador pt-BR', () => {
  assert.equal(formatPixels(25), '25');
  assert.equal(formatPixels(1000000), '1.000.000');
});
