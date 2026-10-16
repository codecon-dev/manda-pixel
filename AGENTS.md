# AGENTS.md — Manda Pixel (site)

Instrucoes para quem mexe neste repositorio: a dev (IA) e qualquer humano. Curto de proposito.
Este arquivo e carregado no contexto da dev em toda tarefa. Atualize quando uma convencao mudar, nao para registrar o que foi feito (isso e o git).

## O que e

Site do experimento Manda Pixel: grade de 1.000 x 1.000 pixels a R$ 1, blocos de 5 x 5 (minimo R$ 25).
Roda como Next.js standalone no container `site` (porta 3000), atras do nginx, em mandapixel.com.br.

## Stack e comandos

- Next.js (App Router) + React + TypeScript strict + Tailwind. `next.config.mjs` com `output: 'standalone'`.
- Build: `npm run build` (= `next build`). Tipos: `npx tsc --noEmit`. Testes: `node --test --experimental-strip-types tests/`.
- Dependencias pinadas no `package.json`. Nada que precise de `postinstall` (scripts sao ignorados na instalacao).
- Banco: `node:sqlite` em `${DATA_DIR}/mandapixel.db` (WAL). Uploads em `${DATA_DIR}/uploads/`. Imagem: `sharp`.

## Pastas

| Pasta | Conteudo |
|---|---|
| `app/components/` | componentes React. Nenhum acessa banco. |
| `app/lib/` | regras de negocio, banco, constantes (`constants.ts`). |
| `app/api/` | rotas: validam entrada, chamam `lib`, respondem JSON. |
| `types/` | tipos compartilhados entre rotas e componentes. |
| `tests/` | testes de `app/lib` com `node --test`. |
| `public/` | estaticos do build (logo.svg, favicons). Uploads NAO ficam aqui. |

## Ambiente (variaveis ja definidas no container)

`DATA_DIR=/data`, `GATEWAY_URL=http://gateway:8000`, `PUBLIC_URL=https://mandapixel.com.br`, `PORT=3000`.

## Regras fixas

- Preco R$ 1/pixel, bloco minimo 5x5, encaixe em multiplos de 5, reserva de 30 min: sao do gateway e do produto, nao mude.
- Pagamento so pelo gateway interno (`GATEWAY_URL`), nunca pelo Asaas direto. Nunca guarde nome, e-mail ou CPF.
- `/diario` e `/time` sao servidos fora deste site: so linke, nao crie rotas com esses nomes.
- Scripts externos so dos dominios permitidos: cdnjs.cloudflare.com, fonts.googleapis.com, fonts.gstatic.com, us.i.posthog.com, us-assets.i.posthog.com.
- Links de anuncio: `rel="sponsored noopener"`.
- Arquivo ate 400 linhas, funcao ate 60. Sem `any`, sem `console.log` de depuracao, sem emoji na interface.
- Toda mudanca passa por `tsc --noEmit` e `npm run build` antes de ser considerada pronta.

## Decisoes de arquitetura (uma linha cada, mais recente por ultimo)

- 2026-10-15: Next.js standalone em vez de export estatico, para ter API, banco e upload.
- 2026-10-15: SQLite nativo do Node (`node:sqlite`) em vez de better-sqlite3 (nao compila sem scripts).
