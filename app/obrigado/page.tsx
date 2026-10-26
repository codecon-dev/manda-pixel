'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  trackCheckoutRetorno,
  trackAnuncioPublicado,
} from '@/app/lib/analytics';
import type { GatewayOrder, OrderSyncResponse } from '@/types/orders';
import ShareAdLinks from '@/app/components/ShareAdLinks';
import ShareOnX from '@/app/components/ShareOnX';
import { SHAREABLE_ORDER_STATUSES } from '@/app/lib/share';

function ObrigadoContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');

  const [order, setOrder] = useState<GatewayOrder | null>(null);
  const [ad, setAd] = useState<OrderSyncResponse['ad'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const trackedRetornoRef = useRef(false);
  const trackedPublicadoRef = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout | null = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!res.ok) {
          if (res.status === 404) {
            if (isMounted) setFetchError('Pedido não encontrado.');
            return;
          }
          throw new Error('Falha ao verificar status.');
        }

        const data: OrderSyncResponse = await res.json();
        if (!isMounted) return;

        setOrder(data.order);
        setAd(data.ad);
        setLoading(false);
        setFetchError(null);

        if (data.order.status === 'paid') {
          if (!trackedRetornoRef.current) {
            trackedRetornoRef.current = true;
            trackCheckoutRetorno({
              orderId,
              resultado: 'sucesso',
            });
          }

          if (data.ad?.status === 'published' && !trackedPublicadoRef.current) {
            trackedPublicadoRef.current = true;
            trackAnuncioPublicado({
              orderId,
              pixels: data.order.pixels,
            });
          }
        } else if (data.order.status === 'pending') {
          timer = setTimeout(checkStatus, 3000);
        }
      } catch {
        if (isMounted) {
          setFetchError('Não foi possível verificar o pagamento agora. Tentando novamente...');
          timer = setTimeout(checkStatus, 4000);
        }
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm text-center max-w-md w-full">
        <h1 className="text-lg font-extrabold text-stone-900 mb-2">Pedido não informado</h1>
        <p className="text-xs text-stone-700 mb-6 leading-relaxed">
          Nenhum identificador de pedido foi encontrado nesta página.
        </p>
        <Link
          href="/"
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm"
        >
          Voltar para a grade
        </Link>
      </div>
    );
  }

  if (loading && !order) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm text-center max-w-md w-full">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-base font-extrabold text-stone-900 mb-1">Consultando pedido</h1>
        <p className="text-xs text-stone-500 font-mono">ID: {orderId}</p>
      </div>
    );
  }

  if (fetchError && !order) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm text-center max-w-md w-full">
        <h1 className="text-base font-extrabold text-stone-900 mb-2">Erro ao consultar</h1>
        <p className="text-xs text-rose-600 mb-6">{fetchError}</p>
        <Link
          href="/"
          className="inline-flex justify-center items-center px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
        >
          Voltar para a grade
        </Link>
      </div>
    );
  }

  const isPaid = order?.status === 'paid';
  const isPending = order?.status === 'pending';
  const isExpired = order?.status === 'expired';
  const isRefunded = order?.status === 'refunded';
  const isPublished = ad?.status === 'published';
  const isInReview = ad?.status === 'in_review' || ad?.moderation_status === 'review' || ad?.moderation_decision === 'review';
  const canShare = order !== null && SHAREABLE_ORDER_STATUSES.has(order.status);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-sm max-w-lg w-full space-y-6">
      {/* Status Pendente */}
      {isPending && (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <div className="w-6 h-6 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-950">Aguardando confirmação</h1>
            <p className="text-xs text-stone-600 mt-1 leading-relaxed">
              Aguardando confirmação do pagamento pelo banco/Asaas. Esta tela atualiza automaticamente assim que o Pix for compensado.
            </p>
          </div>
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-left space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-stone-500">Pedido:</span>
              <span className="font-mono font-bold text-stone-900">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Pixels:</span>
              <span className="font-bold text-stone-900">{order?.pixels.toLocaleString('pt-BR')} px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Valor:</span>
              <span className="font-bold text-stone-900">R$ {order?.value.toLocaleString('pt-BR')},00</span>
            </div>
          </div>
          {order?.checkoutUrl && (
            <a
              href={order.checkoutUrl}
              className="inline-block text-xs font-bold text-purple-900 hover:underline pt-2"
            >
              Abrir tela do checkout novamente
            </a>
          )}
        </div>
      )}

      {/* Status Pago e Publicado */}
      {isPaid && isPublished && (
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-800 font-black text-lg">
              ✓
            </div>
            <h1 className="text-lg font-black text-stone-950">Pagamento confirmado</h1>
            <p className="text-xs text-stone-600 leading-relaxed">
              Seu anúncio foi publicado com sucesso e já está visível para todos os visitantes na grade.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
            {ad?.image_path && (
              <div className="flex justify-center p-3 bg-white rounded-xl border border-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ad.image_path}
                  alt={ad.alt_text || 'Anúncio publicado'}
                  className="max-h-24 max-w-full object-contain"
                />
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-2">
              <span className="text-stone-500">Posição:</span>
              <span className="font-mono font-bold text-stone-900">
                X: {ad?.x}, Y: {ad?.y} ({ad?.w}×{ad?.h} px)
              </span>
            </div>
            {ad?.alt_text && (
              <div className="flex justify-between">
                <span className="text-stone-500">Título / Tooltip:</span>
                <span className="font-bold text-stone-900 text-right truncate max-w-[200px]">
                  {ad.alt_text}
                </span>
              </div>
            )}
            {ad?.link_url && (
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Link de destino:</span>
                <a
                  href={ad.link_url}
                  target="_blank"
                  rel="sponsored noopener"
                  className="font-mono text-purple-900 underline text-right truncate max-w-[200px]"
                >
                  {ad.link_url}
                </a>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Link
              href={ad ? `/?x=${ad.x}&y=${ad.y}` : '/'}
              className="w-full py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs transition shadow-md flex items-center justify-center"
            >
              Ver meu anúncio na grade
            </Link>
            {canShare && <ShareAdLinks orderId={orderId} pixels={order.pixels} />}
          </div>
        </div>
      )}

      {/* Status Pago e em Revisão */}
      {isPaid && isInReview && (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-300 flex items-center justify-center mx-auto text-purple-900 font-black text-lg">
            ⏳
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-950">Pagamento confirmado</h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              O pagamento foi compensado com sucesso. Seu anúncio passará por uma rápida revisão de conformidade e estará visível na grade em instantes.
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs text-left">
            <div className="flex justify-between">
              <span className="text-stone-500">Pedido:</span>
              <span className="font-mono font-bold text-stone-900">{orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Status da moderação:</span>
              <span className="font-bold text-purple-900">Em análise</span>
            </div>
          </div>

          {canShare && <ShareOnX adId={orderId} pixels={order.pixels} variant="comprador" className="w-full" />}

          <div className="pt-2">
            <Link
              href="/"
              className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      )}

      {/* Status Expirado */}
      {isExpired && (
        <div className="space-y-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700 font-black text-lg">
            ✕
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-950">Reserva expirada</h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              O tempo limite para pagamento deste pedido expirou (30 minutos). A reserva foi liberada na grade para outros compradores.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="w-full py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center"
            >
              Escolher novo espaço na grade
            </Link>
          </div>
        </div>
      )}

      {/* Status Devolvido/Reembolsado */}
      {isRefunded && (
        <div className="space-y-5 text-center">
          <h1 className="text-lg font-black text-stone-950">Pedido estornado</h1>
          <p className="text-xs text-stone-600 leading-relaxed">
            Este pedido foi estornado e não está mais ativo na grade de pixels.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="w-full py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center"
            >
              Voltar para a página inicial
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ObrigadoPage() {
  return (
    <main className="min-h-dvh bg-stone-100 flex flex-col items-center justify-center p-4 py-8">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <Suspense
          fallback={
            <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-sm text-center w-full">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-800 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-stone-500 font-medium">Carregando detalhes do pedido...</p>
            </div>
          }
        >
          <ObrigadoContent />
        </Suspense>

        <footer className="text-center text-xs text-stone-700 flex items-center justify-center gap-x-3 gap-y-2 flex-wrap">
          <a href="/diario" className="hover:text-purple-950 transition font-medium">
            Diário
          </a>
          <span className="hidden text-stone-500 sm:inline" aria-hidden="true">•</span>
          <a href="/time" className="hover:text-purple-950 transition font-medium">
            Time
          </a>
          <span className="hidden text-stone-500 sm:inline" aria-hidden="true">•</span>
          <a href="/termos" className="hover:text-purple-950 transition font-medium">
            Termos
          </a>
          <span className="hidden text-stone-500 sm:inline" aria-hidden="true">•</span>
          <a href="/privacidade" className="hover:text-purple-950 transition font-medium">
            Privacidade
          </a>
          <span className="hidden text-stone-500 sm:inline" aria-hidden="true">•</span>
          <a
            href="https://github.com/codecon-dev/manda-pixel"
            target="_blank"
            rel="noopener noreferrer"
            title="Ver código aberto no GitHub"
            className="inline-flex items-center gap-1.5 hover:text-purple-950 transition font-medium"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span>Código aberto no GitHub</span>
          </a>
        </footer>
      </div>
    </main>
  );
}
