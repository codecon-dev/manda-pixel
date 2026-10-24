import test from 'node:test';
import assert from 'node:assert/strict';
import { fitCameraToAds } from '../app/lib/camera-fit.ts';

const DESKTOP = { width: 1280, height: 800 };
const LIMITS = { minZoom: 0.4, maxZoom: 24 };

test('lista vazia devolve null', () => {
  assert.equal(fitCameraToAds([], DESKTOP, LIMITS), null);
});

test('um anúncio 5x5 no centro: zoom limitado em 12, centro 502.5', () => {
  const cam = fitCameraToAds([{ x: 500, y: 500, w: 5, h: 5 }], DESKTOP, LIMITS);
  assert.deepEqual(cam, { x: 502.5, y: 502.5, zoom: 12 });
});

test('dois anúncios distantes: zoom menor e centro no meio do box', () => {
  const cam = fitCameraToAds(
    [{ x: 100, y: 200, w: 10, h: 10 }, { x: 600, y: 400, w: 20, h: 20 }],
    DESKTOP,
    LIMITS
  );
  assert.ok(cam);
  assert.equal(cam.x, 360);
  assert.equal(cam.y, 310);
  assert.ok(Math.abs(cam.zoom - (800 * 0.6) / 520) < 1e-9);
  assert.ok(cam.zoom < 12);
});

test('zoom nunca fica abaixo do minZoom', () => {
  const cam = fitCameraToAds(
    [{ x: 0, y: 0, w: 5, h: 5 }, { x: 995, y: 995, w: 5, h: 5 }],
    { width: 390, height: 844 },
    { minZoom: 0.5, maxZoom: 24 }
  );
  assert.ok(cam);
  assert.equal(cam.zoom, 0.5);
  assert.equal(cam.x, 500);
});

test('maxZoom menor que 12 prevalece', () => {
  const cam = fitCameraToAds([{ x: 500, y: 500, w: 5, h: 5 }], DESKTOP, { minZoom: 0.4, maxZoom: 6 });
  assert.equal(cam?.zoom, 6);
});
