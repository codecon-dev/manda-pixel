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
