'use client';

import React, { useState, useMemo } from 'react';
import BuyPanelCrop from './BuyPanelCrop';
import { validateAdInput, ModerationResult } from '../lib/moderation';
import { trackCheckoutIniciado } from '../lib/analytics';

export interface BuyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selection: { x: number; y: number; w: number; h: number };
  onResizeStep: (axis: 'w' | 'h', delta: number) => void;
  onPreviewChange: (dataUrl: string | null) => void;
  onSubmit?: (data: {
    selection: { x: number; y: number; w: number; h: number };
    title: string;
    linkUrl: string;
    imageDataUrl: string;
  }) => void;
}

export default function BuyPanel({
  isOpen,
  onClose,
  selection,
  onResizeStep,
  onPreviewChange,
  onSubmit,
}: BuyPanelProps) {
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pixels = selection.w * selection.h;
  const price = pixels;

  const moderation: ModerationResult = useMemo(() => {
    return validateAdInput({
      title,
      linkUrl,
      hasImage: Boolean(croppedImage),
      acceptedTerms,
    });
  }, [title, linkUrl, croppedImage, acceptedTerms]);

  const handleCroppedChange = (dataUrl: string | null) => {
    setCroppedImage(dataUrl);
    onPreviewChange(dataUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setErrorMessage(null);
    if (!moderation.valid || !croppedImage || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: selection.x,
          y: selection.y,
          w: selection.w,
          h: selection.h,
          title: title.trim(),
          link: linkUrl.trim(),
          imageDataUrl: croppedImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setErrorMessage(data.error || 'A área selecionada já está ocupada ou reservada.');
        } else if (res.status === 502) {
          setErrorMessage(data.error || 'Sistema de pagamento indisponível no momento. Tente de novo em instantes.');
        } else {
          setErrorMessage(data.error || 'Erro ao processar reserva. Verifique as informações e tente novamente.');
        }
        setIsSubmitting(false);
        return;
      }

      // Sucesso na criação da reserva: dispara checkout_iniciado
      trackCheckoutIniciado({
        orderId: data.orderId,
        pixels: data.pixels,
        value: data.value,
      });

      if (onSubmit) {
        onSubmit({
          selection,
          title: title.trim(),
          linkUrl: linkUrl.trim(),
          imageDataUrl: croppedImage,
        });
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setErrorMessage('Erro de rede ao conectar com o servidor. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex sm:justify-end justify-center items-end sm:items-stretch">
      <div className="w-full sm:w-[420px] max-h-[90dvh] sm:max-h-dvh bg-white shadow-2xl flex flex-col rounded-t-3xl sm:rounded-none sm:border-l border-stone-200 overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Cabecalho */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Comprar Pixels</h2>
            <p className="text-xs text-stone-500 font-medium">Configure seu anúncio na grade</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-200 text-stone-500 hover:text-stone-900 flex items-center justify-center font-bold text-sm transition"
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>

        {/* Formulario com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Card de Coordenadas e Ajuste de Tamanho */}
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex justify-between items-center text-stone-700">
              <span>Posição no mapa:</span>
              <span className="font-mono font-bold text-stone-900">
                X: {selection.x}, Y: {selection.y}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-700">Largura ({selection.w}px):</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selection.w <= 5}
                  onClick={() => onResizeStep('w', -5)}
                  className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-stone-800 disabled:opacity-40 hover:bg-stone-100 transition"
                >
                  -
                </button>
                <span className="w-10 text-center font-mono font-bold text-stone-900">{selection.w}px</span>
                <button
                  type="button"
                  disabled={selection.x + selection.w >= 1000}
                  onClick={() => onResizeStep('w', 5)}
                  className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-stone-800 disabled:opacity-40 hover:bg-stone-100 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-stone-700">Altura ({selection.h}px):</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selection.h <= 5}
                  onClick={() => onResizeStep('h', -5)}
                  className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-stone-800 disabled:opacity-40 hover:bg-stone-100 transition"
                >
                  -
                </button>
                <span className="w-10 text-center font-mono font-bold text-stone-900">{selection.h}px</span>
                <button
                  type="button"
                  disabled={selection.y + selection.h >= 1000}
                  onClick={() => onResizeStep('h', 5)}
                  className="w-7 h-7 rounded-lg bg-white border border-stone-300 font-bold text-stone-800 disabled:opacity-40 hover:bg-stone-100 transition"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
              <span className="text-stone-600 font-medium">{pixels.toLocaleString('pt-BR')} pixels</span>
              <span className="text-purple-900 font-extrabold text-sm">
                R$ {price.toLocaleString('pt-BR')},00
              </span>
            </div>
          </div>

          {/* Upload e Recorte */}
          <BuyPanelCrop
            targetW={selection.w}
            targetH={selection.h}
            onCroppedChange={handleCroppedChange}
            error={touched ? moderation.fieldErrors.image : undefined}
          />

          {/* Titulo / Tooltip */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="ad-title" className="font-bold text-stone-900">
                Título do anúncio (texto do tooltip)
              </label>
              <span className="text-[11px] text-stone-400 font-mono">{title.length}/80</span>
            </div>
            <input
              id="ad-title"
              type="text"
              maxLength={80}
              placeholder="Ex: Minha Empresa Inc."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-700 font-medium text-xs"
            />
            {touched && moderation.fieldErrors.title && (
              <p className="text-[11px] text-rose-600 font-medium">{moderation.fieldErrors.title}</p>
            )}
          </div>

          {/* Link de Destino */}
          <div className="space-y-1">
            <label htmlFor="ad-link" className="font-bold text-stone-900">
              Link de destino (URL)
            </label>
            <input
              id="ad-link"
              type="url"
              placeholder="https://exemplo.com.br"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-700 font-medium text-xs"
            />
            {touched && moderation.fieldErrors.linkUrl && (
              <p className="text-[11px] text-rose-600 font-medium">{moderation.fieldErrors.linkUrl}</p>
            )}
          </div>

          {/* Termos de Uso */}
          <div className="space-y-1 pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded text-purple-800 focus:ring-purple-700"
              />
              <span className="text-[11px] text-stone-600 leading-snug">
                Concordo com os termos. Proibido conteudo adulto, apostas, cripto, politica partidaria ou conteudo ilegal.
              </span>
            </label>
            {touched && moderation.fieldErrors.terms && (
              <p className="text-[11px] text-rose-600 font-medium">{moderation.fieldErrors.terms}</p>
            )}
          </div>

          {/* Mensagem de Erro do Servidor */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-medium leading-relaxed">
              {errorMessage}
            </div>
          )}

          {/* Status de Moderacao Instantanea */}
          {touched && moderation.moderationReason && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-medium">
              Bloqueado: {moderation.moderationReason}
            </div>
          )}

          {/* Botao de Continuar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {isSubmitting
                ? 'Reservando pixels...'
                : `Continuar para pagamento (R$ ${price.toLocaleString('pt-BR')},00)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
