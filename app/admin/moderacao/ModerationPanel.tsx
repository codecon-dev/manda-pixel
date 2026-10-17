'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ModerationQueueItem, ModerationListResponse } from '@/types/orders';

export default function ModerationPanel() {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState({ inReviewCount: 0, publishedCount: 0, rejectedCount: 0 });
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mp_admin_token');
    if (saved) setToken(saved);
  }, []);

  const loadQueue = useCallback(async (adminToken: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (adminToken.trim()) {
        headers['x-admin-key'] = adminToken.trim();
      }
      const res = await fetch('/api/admin/moderation', { headers, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Erro ao carregar fila de moderação', error: true });
        return;
      }
      const listData = data as ModerationListResponse;
      setItems(listData.items);
      setStats(listData.stats);
    } catch {
      setMessage({ text: 'Falha de conexão com a API de moderação', error: true });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue(token);
  }, [loadQueue, token]);

  const handleSaveToken = (val: string) => {
    setToken(val);
    localStorage.setItem('mp_admin_token', val);
  };

  const handleAction = async (orderId: string, action: 'approve' | 'reject') => {
    setProcessingId(orderId);
    setMessage(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token.trim()) headers['x-admin-key'] = token.trim();

      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId,
          action,
          reason: reasons[orderId]?.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error || 'Erro ao processar ação', error: true });
        return;
      }

      setMessage({
        text: action === 'approve' ? `Anúncio ${orderId} aprovado e publicado na grade!` : `Anúncio ${orderId} recusado e área liberada na grade.`,
        error: false,
      });

      // Recarrega lista
      loadQueue(token);
    } catch {
      setMessage({ text: 'Erro ao enviar decisão para o servidor', error: true });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded">
            Administração Interna
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 text-stone-100">
            Fila de Moderação Manual
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Revise anúncios pagos que foram marcados para revisão manual antes de entrarem na grade.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="password"
            placeholder="Chave de Acesso (opcional)"
            value={token}
            onChange={(e) => handleSaveToken(e.target.value)}
            className="bg-stone-900 border border-stone-700 text-stone-200 text-sm rounded px-3 py-2 outline-none focus:border-stone-500"
          />
          <button
            onClick={() => loadQueue(token)}
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 font-medium text-sm px-4 py-2 rounded transition-colors"
          >
            {loading ? 'Sincronizando...' : 'Atualizar Fila'}
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-lg">
          <p className="text-xs text-stone-400 font-medium">Aguardando Revisão</p>
          <p className="text-2xl font-bold text-amber-400 tabular-nums mt-1">{stats.inReviewCount}</p>
        </div>
        <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-lg">
          <p className="text-xs text-stone-400 font-medium">Publicados no Ar</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums mt-1">{stats.publishedCount}</p>
        </div>
        <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-lg">
          <p className="text-xs text-stone-400 font-medium">Recusados / Estornados</p>
          <p className="text-2xl font-bold text-rose-400 tabular-nums mt-1">{stats.rejectedCount}</p>
        </div>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-lg text-sm border ${
            message.error
              ? 'bg-rose-950/40 border-rose-800 text-rose-200'
              : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Queue Items */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">
            Anúncios Pendentes de Decisão ({items.length})
          </h2>
        </div>

        {items.length === 0 ? (
          <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-lg p-12 text-center">
            <p className="text-stone-400 text-base">Nenhum anúncio aguardando moderação manual no momento.</p>
            <p className="text-xs text-stone-600 mt-2">
              Quando um anúncio com palavras suspeitas ou links sensíveis for pago, ele aparecerá aqui para você aprovar ou recusar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {items.map((item) => (
              <div
                key={item.orderId}
                className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start"
              >
                {/* Image Preview */}
                <div className="w-full md:w-48 shrink-0 flex flex-col items-center justify-center bg-stone-950 border border-stone-800 rounded-lg p-2 min-h-36">
                  {item.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="max-h-32 max-w-full object-contain rounded"
                    />
                  ) : (
                    <span className="text-xs text-stone-600">Sem imagem</span>
                  )}
                  <span className="text-[11px] text-stone-500 mt-2 tabular-nums">
                    {item.w} &times; {item.h} ({item.pixels} px)
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                      ID: {item.orderId}
                    </span>
                    <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                      Status: {item.status} ({item.moderationStatus})
                    </span>
                    <span className="text-xs text-stone-400 tabular-nums">
                      Posição: ({item.x}, {item.y})
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-stone-100 truncate">
                    {item.title}
                  </h3>

                  <div className="text-xs text-stone-400 flex items-center gap-1">
                    <span>Link:</span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:underline truncate max-w-md inline-block"
                    >
                      {item.link}
                    </a>
                  </div>

                  {item.moderationReason && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded text-xs text-rose-300">
                      <strong>Motivo do alerta:</strong> {item.moderationReason}
                    </div>
                  )}

                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Motivo em caso de recusa (ex: link encurtado / conteúdo proibido)"
                      value={reasons[item.orderId] || ''}
                      onChange={(e) =>
                        setReasons({ ...reasons, [item.orderId]: e.target.value })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-stone-600"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="w-full md:w-auto flex md:flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(item.orderId, 'approve')}
                    disabled={processingId === item.orderId}
                    className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs px-4 py-2.5 rounded transition-colors"
                  >
                    Aprovar Anúncio
                  </button>
                  <button
                    onClick={() => handleAction(item.orderId, 'reject')}
                    disabled={processingId === item.orderId}
                    className="flex-1 md:flex-none bg-rose-800 hover:bg-rose-700 disabled:opacity-50 text-white font-medium text-xs px-4 py-2.5 rounded transition-colors"
                  >
                    Recusar e Liberar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
