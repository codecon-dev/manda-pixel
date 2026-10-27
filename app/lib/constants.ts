// Recorte do anúncio: quantos px de imagem por pixel do bloco
export const CROP_MAX_SCALE = 20;
export const CROP_MAX_SIDE = 1000;

// Upload do anúncio (PNG gerado pelo recorte)
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

// Imagem com pelo menos isto de px por pixel do bloco é desenhada suavizada
export const SMOOTH_MIN_SCALE = 4;

// Lado máximo, em px de tela, da imagem ampliada no card do anúncio
export const AD_CARD_IMAGE_MAX = 160;

// URL pública do site (metadataBase, robots, sitemap)
export const SITE_URL = process.env.PUBLIC_URL ?? "https://mandapixel.com.br";

// Produto: preço por pixel, total da grade e meta do experimento
export const PIXEL_PRICE_BRL = 1;
export const TOTAL_PIXELS = 1_000_000;
export const GOAL_BRL = 1_000_000;

// Home aberta focada num ponto (?x=&y=): zoom inicial e maior coordenada aceita
export const FOCUS_ZOOM = 4;
export const GRID_MAX_COORD = 999;

// Página pública do anúncio: largura máxima da imagem e corte da descrição
export const AD_PAGE_IMAGE_MAX = 480;
export const AD_DESCRIPTION_MAX = 150;

// Presença: visitante some do "online" após este tempo sem heartbeat
export const PRESENCE_TTL_MS = 60_000;

// Home sem foco abre enquadrando os anúncios no ar: fração da tela, lado mínimo e zoom máximo
export const FIT_VIEWPORT_FRACTION = 0.6;
export const FIT_MIN_SIDE = 40;
export const FIT_MAX_ZOOM = 12;

// Experimento: data de início (horário de São Paulo) e duração em dias
export const EXPERIMENT_START = "2026-11-01";
export const EXPERIMENT_DAYS = 365;
