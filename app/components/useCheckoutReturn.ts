'use client';

import { useEffect, useState } from 'react';
import { isValidPublicAdId } from '../lib/ad-rules';
import { trackCheckoutRetorno } from '../lib/analytics';
import { CHECKOUT_RETURN_ERROR, checkoutReturnNotice } from '../lib/checkout-return';

export interface CheckoutReturnBanner {
  title: string;
  message: string;
}

/** Com ?order= na URL, consulta o pedido e devolve o aviso com o status real. */
export function useCheckoutReturn(onRefresh?: () => void) {
  const [banner, setBanner] = useState<CheckoutReturnBanner | null>(null);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get('order');
    if (!orderId || !isValidPublicAdId(orderId)) return;
    let active = true;

    fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data: unknown = res.ok ? await res.json() : null;
        const status = (data as { order?: { status?: unknown } } | null)?.order?.status;
        const notice = checkoutReturnNotice(status);
        if (!active) return;
        if (!notice) {
          setBanner({ ...CHECKOUT_RETURN_ERROR });
          return;
        }
        setBanner({ title: notice.title, message: notice.message });
        trackCheckoutRetorno({ orderId, resultado: notice.resultado });
        onRefresh?.();
      })
      .catch(() => {
        if (active) setBanner({ ...CHECKOUT_RETURN_ERROR });
      });

    return () => {
      active = false;
    };
  }, [onRefresh]);

  return { banner, dismiss: () => setBanner(null) };
}
