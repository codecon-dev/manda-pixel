import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCamera, mainCluster, rectGap } from '../app/lib/initial-camera.ts';
import {
  HOME_HEADER_INSET,
  INITIAL_CAMERA_MIN_ZOOM,
  WELCOME_CARD_DESKTOP_H,
} from '../app/lib/constants.ts';

const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const LIMITS = { minZoom: 0.4, maxZoom: 24 };

// ~17 anúncios entre x 490-535 e y 455-520, como na grade de hoje
const CENTRAL = [
  { x: 490, y: 455, w: 10, h: 10 },
  { x: 500, y: 460, w: 5, h: 5 },
  { x: 510, y: 470, w: 25, h: 15 },
  { x: 495, y: 490, w: 20, h: 20 },
  { x: 520, y: 505, w: 15, h: 15 },
];
const ISOLATED_TOP = { x: 500, y: 0, w: 5, h: 5 };

test('cluster central + 1 bloco isolado no topo: centra no cluster e zoom >= piso', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    const cam = initialCamera([...CENTRAL, ISOLATED_TOP], vp, LIMITS);
    assert.ok(cam);
    assert.equal(cam.x, 512.5);
    assert.equal(cam.y, 487.5);
    assert.ok(cam.zoom >= INITIAL_CAMERA_MIN_ZOOM);
    assert.deepEqual(cam, initialCamera(CENTRAL, vp, LIMITS));
  }
});

test('grade vazia: null (quem chama mantém o centro 500,500)', () => {
  assert.equal(initialCamera([], DESKTOP, LIMITS), null);
});

test('dois clusters: escolhe o de maior área', () => {
  const small = [{ x: 100, y: 100, w: 5, h: 5 }, { x: 110, y: 100, w: 5, h: 5 }, { x: 120, y: 100, w: 5, h: 5 }];
  const big = [{ x: 800, y: 800, w: 30, h: 30 }];
  assert.deepEqual(mainCluster([...small, ...big]), big);
  const cam = initialCamera([...small, ...big], DESKTOP, LIMITS);
  assert.ok(cam);
  assert.equal(cam.x, 815);
  assert.equal(cam.y, 815);
});

test('empate de área e blocos: o mais perto do centro da grade', () => {
  const far = [{ x: 0, y: 0, w: 10, h: 10 }];
  const near = [{ x: 480, y: 480, w: 10, h: 10 }];
  assert.deepEqual(mainCluster([...far, ...near]), near);
});

test('cluster maior que o piso: zoom fica no piso e centra no centro de massa', () => {
  const wide = [{ x: 0, y: 500, w: 400, h: 400 }, { x: 440, y: 500, w: 5, h: 5 }];
  const cam = initialCamera(wide, MOBILE, LIMITS);
  assert.ok(cam);
  assert.equal(cam.zoom, INITIAL_CAMERA_MIN_ZOOM);
  assert.ok(cam.x < 222.5 && cam.x > 200);
});

test('insets: centro do cluster vai para o meio da faixa visível', () => {
  const vp = { ...MOBILE, insetTop: 104, insetBottom: 338 };
  const cam = initialCamera(CENTRAL, vp, LIMITS);
  assert.ok(cam);
  assert.ok(cam.zoom >= INITIAL_CAMERA_MIN_ZOOM);
  const screenY = (487.5 - cam.y) * cam.zoom + vp.height / 2;
  assert.ok(Math.abs(screenY - (104 + (844 - 104 - 338) / 2)) < 1e-9);
});

test('desktop com card de boas-vindas: cluster no meio da faixa abaixo do card', () => {
  const insetTop = HOME_HEADER_INSET + WELCOME_CARD_DESKTOP_H;
  const vp = { ...DESKTOP, insetTop, insetBottom: 0 };
  const cam = initialCamera(CENTRAL, vp, LIMITS);
  assert.ok(cam);
  assert.ok(cam.zoom >= INITIAL_CAMERA_MIN_ZOOM);
  const screenY = (487.5 - cam.y) * cam.zoom + vp.height / 2;
  assert.ok(Math.abs(screenY - (insetTop + (vp.height - insetTop) / 2)) < 1e-9);
  // topo do cluster (y 455, com margem) fica abaixo do card
  assert.ok((455 - cam.y) * cam.zoom + vp.height / 2 >= insetTop);
});

test('zoom respeita o máximo existente', () => {
  const cam = initialCamera([{ x: 500, y: 500, w: 5, h: 5 }], DESKTOP, { minZoom: 0.4, maxZoom: 6 });
  assert.equal(cam?.zoom, 6);
});

test('rectGap: encostados = 0, afastados na diagonal = hipotenusa', () => {
  assert.equal(rectGap({ x: 0, y: 0, w: 5, h: 5 }, { x: 5, y: 0, w: 5, h: 5 }), 0);
  assert.equal(rectGap({ x: 0, y: 0, w: 5, h: 5 }, { x: 8, y: 9, w: 5, h: 5 }), 5);
});
