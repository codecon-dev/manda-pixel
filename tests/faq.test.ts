import test from 'node:test';
import assert from 'node:assert/strict';
import { FAQ_ITEMS, buildFaqPageJsonLd, serializeJsonLd } from '../app/lib/faq.ts';

test('FAQPage tem contexto schema.org e uma Question por item', () => {
  const ld = buildFaqPageJsonLd(FAQ_ITEMS);
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(ld['@type'], 'FAQPage');
  assert.equal(ld.mainEntity.length, 4);
  ld.mainEntity.forEach((q, i) => {
    assert.equal(q['@type'], 'Question');
    assert.equal(q.name, FAQ_ITEMS[i].question);
    assert.equal(q.acceptedAnswer['@type'], 'Answer');
    assert.equal(q.acceptedAnswer.text, FAQ_ITEMS[i].answer);
  });
});

test('menor anuncio custa R$ 25 e reserva e de 30 min', () => {
  assert.match(FAQ_ITEMS[0].answer, /^R\$ 25\./);
  assert.match(FAQ_ITEMS[3].question, /30 min/);
});

test('lista vazia lanca erro', () => {
  assert.throws(() => buildFaqPageJsonLd([]));
});

test('serializacao escapa < para nao fechar a tag script', () => {
  const out = serializeJsonLd(buildFaqPageJsonLd([{ question: '</script>', answer: 'a' }]));
  assert.ok(!out.includes('</script>'));
  assert.deepEqual(JSON.parse(out).mainEntity[0].name, '</script>');
});
