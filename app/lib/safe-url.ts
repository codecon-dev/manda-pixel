/** Link do anunciante so sai do site se for http(s) bem formado; qualquer outro esquema vira null. */
export function safeHttpUrl(url: string | null): URL | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed : null;
  } catch {
    return null; // link malformado: quem chama trata como "sem link"
  }
}
