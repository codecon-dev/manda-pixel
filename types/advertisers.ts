/** Bloco da grade como chega de getGridState(); so os campos publicos que a lista usa. */
export type AdvertiserSource = {
  id: string;
  state: string;
  altText?: string;
  linkUrl?: string;
  number?: number;
};

/** Anuncio no ar com a data usada para numerar (#1, #2...), mesma regra de getPublicAdById. */
export type LiveAdRef = { orderId: string; paidAt: string | null };

/** Item publico da lista de anunciantes. Sem dado de comprador. */
export type Advertiser = {
  id: string;
  number: number;
  name: string;
  domain: string;
  href: string;
};
