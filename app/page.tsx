'use client';

import React, { useEffect, useState, useCallback } from 'react';
import PixelCanvas from './components/PixelCanvas';
import { GridBlock, GridStats, GridResponse } from './lib/db';

const DEFAULT_STATS: GridStats = {
  totalPixels: 1000000,
  soldPixels: 0,
  reservedPixels: 0,
  availablePixels: 1000000,
  occupiedBlocksCount: 0,
};

export default function Home() {
  const [blocks, setBlocks] = useState<GridBlock[]>([]);
  const [stats, setStats] = useState<GridStats>(DEFAULT_STATS);

  const fetchGrid = useCallback(async () => {
    try {
      const res = await fetch('/api/grid', { cache: 'no-store' });
      if (!res.ok) return;
      const data: GridResponse = await res.json();
      if (Array.isArray(data.blocks)) {
        setBlocks(data.blocks);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Falha ao sincronizar grade:', err);
    }
  }, []);

  useEffect(() => {
    fetchGrid();
    const interval = setInterval(fetchGrid, 30000);
    return () => clearInterval(interval);
  }, [fetchGrid]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-stone-100">
      <PixelCanvas blocks={blocks} stats={stats} onRefresh={fetchGrid} />
    </main>
  );
}
