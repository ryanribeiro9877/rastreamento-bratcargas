// hooks/usePosicoes.ts - Hook para gerenciar posições GPS

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { PosicaoGPS } from '../types';

export function usePosicoes(cargaId: string) {
  const [posicoes, setPosicoes] = useState<PosicaoGPS[]>([]);
  const [ultimaPosicao, setUltimaPosicao] = useState<PosicaoGPS | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cargaId) return;
    fetchPosicoes();
  }, [cargaId]);

  async function fetchPosicoes() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('posicoes_gps')
        .select('*')
        .eq('carga_id', cargaId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      setPosicoes(data || []);
      setUltimaPosicao(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error('Erro ao buscar posições:', err);
    } finally {
      setLoading(false);
    }
  }

  async function adicionarPosicao(
    latitude: number,
    longitude: number,
    velocidade?: number,
    origem: 'api_rastreamento' | 'manual' = 'manual'
  ) {
    try {
      const { data, error } = await supabase
        .from('posicoes_gps')
        .insert([
          {
            carga_id: cargaId,
            latitude,
            longitude,
            velocidade,
            origem,
            timestamp: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setPosicoes((prev) => [data, ...prev]);
      setUltimaPosicao(data);
      
      return data;
    } catch (err) {
      console.error('Erro ao adicionar posição:', err);
      throw err;
    }
  }

  return {
    posicoes,
    ultimaPosicao,
    loading,
    refetch: fetchPosicoes,
    adicionarPosicao
  };
}
