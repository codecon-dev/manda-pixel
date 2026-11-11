import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { encodePng } from '../app/lib/png-upscale.ts';
import { AdImageError, reencodeAdPng } from '../app/lib/upload-validation.ts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IEND = Buffer.from('IEND');

async function sharpInstalled(): Promise<boolean> {
  try {
    await import('sharp');
    return true;
  } catch {
    return false;
  }
}

const sharpReady = sharpInstalled();

/** Sem sharp no ambiente, marca o teste como pulado e avisa em vez de quebrar. */
async function missingSharp(t: TestContext): Promise<boolean> {
  if (await sharpReady) return false;
  t.skip('sharp não está em node_modules: teste de reencode pulado');
  return true;
}

function solidPng(width: number, height: number): Buffer {
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) rgba.set([106, 51, 120, 255], i * 4);
  return encodePng({ width, height, rgba });
}

async function rejectsWith(promise: Promise<Buffer>, code: string): Promise<void> {
  await assert.rejects(promise, (err: unknown) => err instanceof AdImageError && err.code === code);
}

test('PNG válido do tamanho certo passa e volta como PNG', async (t) => {
  if (await missingSharp(t)) return;
  const out = await reencodeAdPng(solidPng(100, 100), 100, 100);
  assert.deepEqual(out.subarray(0, 8), PNG_SIGNATURE);
});

test('PNG de tamanho errado é recusado', async (t) => {
  if (await missingSharp(t)) return;
  await rejectsWith(reencodeAdPng(solidPng(100, 100), 100, 200), 'wrong-size');
});

test('bytes que não são imagem são recusados', async (t) => {
  if (await missingSharp(t)) return;
  await rejectsWith(reencodeAdPng(Buffer.from('isto não é uma imagem'), 100, 100), 'invalid');
});

test('PNG truncado é recusado', async (t) => {
  if (await missingSharp(t)) return;
  const png = solidPng(100, 100);
  await rejectsWith(reencodeAdPng(png.subarray(0, Math.floor(png.length / 2)), 100, 100), 'invalid');
});

test('lixo após o IEND não sobrevive ao reencode', async (t) => {
  if (await missingSharp(t)) return;
  const marker = Buffer.from('LIXO-ANEXADO-DEPOIS-DO-IEND');
  const dirty = Buffer.concat([solidPng(100, 100), marker]);
  let out: Buffer;
  try {
    out = await reencodeAdPng(dirty, 100, 100);
  } catch (err) {
    assert.ok(err instanceof AdImageError && err.code === 'invalid');
    return;
  }
  assert.equal(out.indexOf(marker), -1);
  assert.equal(out.lastIndexOf(IEND), out.length - 8);
});
