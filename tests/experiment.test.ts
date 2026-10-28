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

test('31/10/2027 em SP é o dia 365', () => {
  assert.deepEqual(experimentStatus(new Date('2027-10-31T12:00:00-03:00')), { started: true, day: 365 });
});

test('01/11/2027 em SP o experimento está encerrado', () => {
  assert.deepEqual(experimentStatus(new Date('2027-11-01T00:00:00-03:00')), { started: true, ended: true });
});

test('31/10/2026 23:59 -03:00 ainda falta 1 dia', () => {
  assert.equal(experimentStatus(new Date('2026-10-31T23:59:59-03:00')).started, false);
  assert.deepEqual(experimentStatus(new Date('2026-10-31T23:59:59-03:00')), { started: false, daysToStart: 1 });
});

test('01/11/2026 00:00 -03:00 é o dia 1, não encerrado', () => {
  const status = experimentStatus(new Date('2026-11-01T00:00:00-03:00'));
  assert.deepEqual(status, { started: true, day: 1 });
  assert.notEqual(status.started && status.ended, true);
});

test('formatPixels usa separador pt-BR', () => {
  assert.equal(formatPixels(25), '25');
  assert.equal(formatPixels(1000000), '1.000.000');
});
