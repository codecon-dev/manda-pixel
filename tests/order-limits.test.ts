import test from 'node:test';
import assert from 'node:assert/strict';
import { exceedsOrderLimit, MAX_ORDER_PIXELS } from '../app/lib/order-limits.ts';

test('teto de pixels por pedido', () => {
  assert.equal(MAX_ORDER_PIXELS, 50000);
  assert.equal(exceedsOrderLimit(250, 200), false);
  assert.equal(exceedsOrderLimit(5, 10000), false);
  assert.equal(exceedsOrderLimit(250, 205), true);
  assert.equal(exceedsOrderLimit(1000, 450), true);
});
