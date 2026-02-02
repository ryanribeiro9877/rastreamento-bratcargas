// hooks/useRealtime.ts - Hook para updates em tempo real

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

interface UseRealtimeOptions {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
}

/**
 * Hook para escutar mudanças em tempo real em uma tabela do Supabase
 */
export function useRealtime(
  tabela: string,
  filtro?: string,
  options?: UseRealtimeOptions
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Criar canal de realtime
    const channelName = `${tabela}_${filtro || 'all'}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Configurar subscription
    let subscription = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tabela,
        filter: filtro
      },
      (payload) => {
        console.log(`[Realtime ${tabela}]`, payload);

        switch (payload.eventType) {
          case 'INSERT':
            options?.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            options?.onUpdate?.(payload.new);
            break;
          case 'DELETE':
            options?.onDelete?.(payload.old);
            break;
        }
      }
    );

    // Subscrever ao canal
    subscription.subscribe((status) => {
      console.log(`[Realtime ${tabela}] Status:`, status);
    });

    channelRef.current = channel;

    // Cleanup ao desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [tabela, filtro]);

  return {
    isConnected: !!channelRef.current
  };
}

/**
 * Hook para escutar mudanças nas posições GPS de uma carga
 */
export function useRealtimePosicoesGPS(
  cargaId: string,
  onNovaPosicao: (posicao: any) => void
) {
  return useRealtime(
    'posicoes_gps',
    `carga_id=eq.${cargaId}`,
    {
      onInsert: onNovaPosicao,
      onUpdate: onNovaPosicao
    }
  );
}

/**
 * Hook para escutar mudanças em cargas
 */
export function useRealtimeCargas(
  embarcadorId: string | undefined,
  onCargaAtualizada: (carga: any) => void
) {
  const filtro = embarcadorId ? `embarcador_id=eq.${embarcadorId}` : undefined;

  return useRealtime(
    'cargas',
    filtro,
    {
      onUpdate: onCargaAtualizada,
      onInsert: onCargaAtualizada
    }
  );
}

/**
 * Hook para auto-refresh periódico (fallback se realtime falhar)
 */
export function useAutoRefresh(callback: () => void, intervalMs: number = 30000) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const interval = setInterval(() => {
      callbackRef.current();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);
}
