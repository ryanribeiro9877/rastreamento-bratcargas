// hooks/useCargas.ts - Hook para gerenciar cargas

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Carga, CargaFormData, FiltrosCargas, MetricasDashboard } from '../types';
import { calcularDistanciaTotal } from '../utils/calculos';

export function useCargas(embarcadorId?: string, filtros?: FiltrosCargas) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCargas();
  }, [embarcadorId, JSON.stringify(filtros)]);

  async function fetchCargas() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('cargas')
        .select(`
          *,
          embarcador:embarcadores(*),
          ultima_posicao:posicoes_gps(*)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Filtro por embarcador (se for usuário de embarcador)
      if (embarcadorId) {
        query = query.eq('embarcador_id', embarcadorId);
      }

      // Aplicar filtros adicionais
      if (filtros) {
        if (filtros.status && filtros.status.length > 0) {
          query = query.in('status', filtros.status);
        }

        if (filtros.status_prazo && filtros.status_prazo.length > 0) {
          query = query.in('status_prazo', filtros.status_prazo);
        }

        if (filtros.nota_fiscal) {
          query = query.ilike('nota_fiscal', `%${filtros.nota_fiscal}%`);
        }

        if (filtros.origem_uf) {
          query = query.eq('origem_uf', filtros.origem_uf);
        }

        if (filtros.destino_uf) {
          query = query.eq('destino_uf', filtros.destino_uf);
        }

        if (filtros.motorista_nome) {
          query = query.ilike('motorista_nome', `%${filtros.motorista_nome}%`);
        }

        if (filtros.placa_veiculo) {
          query = query.ilike('placa_veiculo', `%${filtros.placa_veiculo}%`);
        }

        if (filtros.data_carregamento_inicio) {
          query = query.gte('data_carregamento', filtros.data_carregamento_inicio);
        }

        if (filtros.data_carregamento_fim) {
          query = query.lte('data_carregamento', filtros.data_carregamento_fim);
        }

        if (filtros.prazo_entrega_inicio) {
          query = query.gte('prazo_entrega', filtros.prazo_entrega_inicio);
        }

        if (filtros.prazo_entrega_fim) {
          query = query.lte('prazo_entrega', filtros.prazo_entrega_fim);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Buscar última posição para cada carga
      const cargasComPosicao = await Promise.all(
        (data || []).map(async (carga) => {
          const { data: posicoes } = await supabase
            .from('posicoes_gps')
            .select('*')
            .eq('carga_id', carga.id)
            .order('timestamp', { ascending: false })
            .limit(1);

          return {
            ...carga,
            ultima_posicao: posicoes && posicoes.length > 0 ? posicoes[0] : undefined
          };
        })
      );

      setCargas(cargasComPosicao as Carga[]);
    } catch (err) {
      console.error('Erro ao buscar cargas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function criarCarga(dados: CargaFormData): Promise<Carga> {
    try {
      // Calcular distância total
      const distanciaTotal = calcularDistanciaTotal(
        dados.origem_lat || 0,
        dados.origem_lng || 0,
        dados.destino_lat || 0,
        dados.destino_lng || 0
      );

      const { data, error } = await supabase
        .from('cargas')
        .insert([
          {
            ...dados,
            distancia_total_km: distanciaTotal,
            status: 'em_transito',
            status_prazo: 'no_prazo',
            velocidade_media_estimada: dados.velocidade_media_estimada || 60
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('historico_status').insert([
        {
          carga_id: data.id,
          status_novo: 'em_transito',
          observacao: 'Carga criada'
        }
      ]);

      await fetchCargas();
      return data;
    } catch (err) {
      console.error('Erro ao criar carga:', err);
      throw err;
    }
  }

  async function atualizarCarga(id: string, dados: Partial<CargaFormData>): Promise<void> {
    try {
      const { error } = await supabase
        .from('cargas')
        .update(dados)
        .eq('id', id);

      if (error) throw error;
      await fetchCargas();
    } catch (err) {
      console.error('Erro ao atualizar carga:', err);
      throw err;
    }
  }

  async function marcarComoEntregue(id: string): Promise<void> {
    try {
      const carga = cargas.find((c) => c.id === id);
      if (!carga) throw new Error('Carga não encontrada');

      const { error } = await supabase
        .from('cargas')
        .update({
          status: 'entregue',
          data_entrega_real: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('historico_status').insert([
        {
          carga_id: id,
          status_anterior: carga.status,
          status_novo: 'entregue',
          observacao: 'Carga entregue'
        }
      ]);

      // Disparar alerta de entrega
      await dispararAlertaEntrega(id);

      await fetchCargas();
    } catch (err) {
      console.error('Erro ao marcar como entregue:', err);
      throw err;
    }
  }

  async function cancelarCarga(id: string, motivo: string): Promise<void> {
    try {
      const carga = cargas.find((c) => c.id === id);
      if (!carga) throw new Error('Carga não encontrada');

      const { error } = await supabase
        .from('cargas')
        .update({ status: 'cancelada' })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('historico_status').insert([
        {
          carga_id: id,
          status_anterior: carga.status,
          status_novo: 'cancelada',
          observacao: motivo
        }
      ]);

      await fetchCargas();
    } catch (err) {
      console.error('Erro ao cancelar carga:', err);
      throw err;
    }
  }

  async function dispararAlertaEntrega(cargaId: string): Promise<void> {
    try {
      const carga = cargas.find((c) => c.id === cargaId);
      if (!carga) return;

      await supabase.from('alertas').insert([
        {
          carga_id: cargaId,
          tipo: 'entrega',
          destinatario: 'embarcador',
          mensagem: `Carga NF ${carga.nota_fiscal} foi entregue com sucesso!`,
          enviado: false
        }
      ]);
    } catch (err) {
      console.error('Erro ao disparar alerta:', err);
    }
  }

  return {
    cargas,
    loading,
    error,
    refetch: fetchCargas,
    criarCarga,
    atualizarCarga,
    marcarComoEntregue,
    cancelarCarga
  };
}

// Hook para métricas do dashboard
export function useMetricasDashboard(embarcadorId?: string): {
  metricas: MetricasDashboard | null;
  loading: boolean;
} {
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetricas();
  }, [embarcadorId]);

  async function fetchMetricas() {
    try {
      setLoading(true);

      let query = supabase
        .from('cargas')
        .select('*')
        .eq('ativo', true);

      if (embarcadorId) {
        query = query.eq('embarcador_id', embarcadorId);
      }

      const { data: cargas, error } = await query;
      if (error) throw error;

      const total = cargas?.length || 0;
      const emTransito = cargas?.filter((c) => c.status === 'em_transito').length || 0;
      const entregues = cargas?.filter((c) => c.status === 'entregue').length || 0;
      
      const noPrazo = cargas?.filter((c) => c.status_prazo === 'no_prazo').length || 0;
      const atrasadas = cargas?.filter((c) => c.status_prazo === 'atrasado').length || 0;
      const adiantadas = cargas?.filter((c) => c.status_prazo === 'adiantado').length || 0;

      const totalToneladas = cargas?.reduce((sum, c) => sum + (c.toneladas || 0), 0) || 0;
      const toneladasEntregues = cargas
        ?.filter((c) => c.status === 'entregue')
        .reduce((sum, c) => sum + (c.toneladas || 0), 0) || 0;

      setMetricas({
        total_cargas: total,
        cargas_em_transito: emTransito,
        cargas_entregues: entregues,
        cargas_no_prazo: noPrazo,
        cargas_atrasadas: atrasadas,
        cargas_adiantadas: adiantadas,
        total_toneladas_transporte: totalToneladas,
        total_toneladas_entregues: toneladasEntregues,
        percentual_entrega_prazo: entregues > 0 ? (noPrazo / entregues) * 100 : 0,
        percentual_entrega_adiantada: entregues > 0 ? (adiantadas / entregues) * 100 : 0,
        percentual_entrega_atrasada: entregues > 0 ? (atrasadas / entregues) * 100 : 0
      });
    } catch (err) {
      console.error('Erro ao calcular métricas:', err);
    } finally {
      setLoading(false);
    }
  }

  return { metricas, loading };
}
