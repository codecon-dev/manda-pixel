// Recorte do anúncio: quantos px de imagem por pixel do bloco
export const CROP_MAX_SCALE = 20;
export const CROP_MAX_SIDE = 1000;

// Upload do anúncio (PNG gerado pelo recorte)
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// Teto de pixels que o sharp aceita decodificar no upload (protege memória)
export const MAX_INPUT_PIXELS = 100_000_000;

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

// Lado mínimo e múltiplo do bloco (espelha a regra de isAreaAvailable em db.ts) e minutos de reserva
export const BLOCK_SIZE = 5;
export const RESERVATION_MINUTES = 30;

// Conteúdo proibido (termos e como-funciona)
export const PROHIBITED = [
  "Conteúdo adulto ou sexual.",
  "Apostas, bets e cassino.",
  "Criptomoeda, token, NFT, pirâmide, dinheiro fácil ou qualquer coisa com cara de golpe.",
  "Política: partido, candidato ou campanha.",
  "Conteúdo ilegal, de ódio, violência ou envolvendo menores.",
  "Imagem de pessoa real sem autorização clara.",
  "Link quebrado, encurtador suspeito ou link com download automático.",
] as const;

// Home aberta focada num ponto (?x=&y=): zoom inicial e maior coordenada aceita
export const FOCUS_ZOOM = 4;
export const GRID_MAX_COORD = 999;

// Página /previa: janela da grade mostrada (lado em pixels da grade), canvas de compartilhamento e lados oferecidos
export const PREVIEW_WINDOW = 200;
export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
export const PREVIEW_SIZES = [5, 10, 20, 30, 50] as const;
// Zoom da /previa: janela = maior lado do logo x fator, travada entre min e a grade inteira; lado do canvas na tela
export const PREVIEW_ZOOM_NEAR = { factor: 5, min: 60 } as const;
export const PREVIEW_ZOOM_MEDIUM = { factor: 12, min: 200 } as const;
export const PREVIEW_SCREEN_SIZE = 800;

// Página pública do anúncio: largura máxima da imagem e corte da descrição
export const AD_PAGE_IMAGE_MAX = 480;
export const AD_DESCRIPTION_MAX = 150;

// Presença: visitante some do "online" após este tempo sem heartbeat
export const PRESENCE_TTL_MS = 60_000;

// Home sem foco abre enquadrando os anúncios no ar: fração da tela, lado mínimo e zoom máximo
export const FIT_VIEWPORT_FRACTION = 0.6;
export const FIT_MIN_SIDE = 40;
export const FIT_MAX_ZOOM = 12;
// Vista inicial: blocos a até esta distância (px de grade) formam o mesmo aglomerado; só o principal entra na câmera
export const CLUSTER_LINK_DISTANCE = 50;
// Margem em volta do aglomerado (fração do lado) e piso de zoom: 4 px de tela por pixel (bloco 5x5 = 20 px)
export const INITIAL_CAMERA_MARGIN = 0.12;
export const INITIAL_CAMERA_MIN_ZOOM = 4;
// Altura (px de tela) do header flutuante da home que cobre o topo da grade (no celular a 2a linha quebra em 3)
export const HOME_HEADER_INSET = 124;
export const HOME_HEADER_INSET_MOBILE = 180;

// Experimento: data de início (horário de São Paulo) e duração em dias
export const EXPERIMENT_START = "2026-11-01";
export const EXPERIMENT_DAYS = 365;

// Intervalo mínimo entre varreduras de imagens de pedidos expirados
export const EXPIRED_UPLOAD_SWEEP_MS = 60 * 60 * 1000;
