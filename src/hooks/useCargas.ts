// hooks/useCargas.ts - Hook para gerenciar cargas

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import type { Carga, CargaFormData, FiltrosCargas, MetricasDashboard } from '../types';
import { calcularDistanciaTotal } from '../utils/calculos';
import { withTimeout } from '../utils/async';

export function useCargas(embarcadorId?: string, filtros?: FiltrosCargas) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memorizar os filtros serializados para evitar loops infinitos
  const filtrosSerializados = useMemo(() => {
    if (!filtros) return '{}';
    return JSON.stringify(filtros);
  }, [
    filtros?.status?.join(','),
    filtros?.status_prazo?.join(','),
    filtros?.nota_fiscal,
    filtros?.origem_uf,
    filtros?.destino_uf,
    filtros?.motorista_nome,
    filtros?.placa_veiculo,
    filtros?.data_carregamento_inicio,
    filtros?.data_carregamento_fim,
    filtros?.prazo_entrega_inicio,
    filtros?.prazo_entrega_fim
  ]);

  useEffect(() => {
    fetchCargas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embarcadorId, filtrosSerializados]);

  async function fetchCargas() {
    try {
      setLoading(true);
      setError(null);

      const filtrosObj = filtros || {};

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
      if (filtrosObj.status && filtrosObj.status.length > 0) {
        query = query.in('status', filtrosObj.status);
      }

      if (filtrosObj.status_prazo && filtrosObj.status_prazo.length > 0) {
        query = query.in('status_prazo', filtrosObj.status_prazo);
      }

      if (filtrosObj.nota_fiscal) {
        query = query.ilike('nota_fiscal', `%${filtrosObj.nota_fiscal}%`);
      }

      if (filtrosObj.origem_uf) {
        query = query.eq('origem_uf', filtrosObj.origem_uf);
      }

      if (filtrosObj.destino_uf) {
        query = query.eq('destino_uf', filtrosObj.destino_uf);
      }

      if (filtrosObj.motorista_nome) {
        query = query.ilike('motorista_nome', `%${filtrosObj.motorista_nome}%`);
      }

      if (filtrosObj.placa_veiculo) {
        query = query.ilike('placa_veiculo', `%${filtrosObj.placa_veiculo}%`);
      }

      if (filtrosObj.data_carregamento_inicio) {
        query = query.gte('data_carregamento', filtrosObj.data_carregamento_inicio);
      }

      if (filtrosObj.data_carregamento_fim) {
        query = query.lte('data_carregamento', filtrosObj.data_carregamento_fim);
      }

      if (filtrosObj.prazo_entrega_inicio) {
        query = query.gte('prazo_entrega', filtrosObj.prazo_entrega_inicio);
      }

      if (filtrosObj.prazo_entrega_fim) {
        query = query.lte('prazo_entrega', filtrosObj.prazo_entrega_fim);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Buscar última posição para cada carga
      const cargasComPosicao = await Promise.all(
        (data || []).map(async (carga: any) => {
          const { data: posicoes } = await supabase
            .from('posicoes_gps')
            .select('*')
            .eq('carga_id', carga.id)
            .order('timestamp', { ascending: false })
            .limit(1);

          return {
            ...carga,
            embarcador: carga.embarcador ?? undefined,
            ultima_posicao: posicoes && posicoes.length > 0 ? posicoes[0] : undefined
          } as Carga;
        })
      );

      setCargas(cargasComPosicao);
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

      // Filtrar apenas os campos válidos para a tabela cargas
      const dadosParaInserir = {
        embarcador_id: dados.embarcador_id,
        nota_fiscal: dados.nota_fiscal,
        origem_cidade: dados.origem_cidade,
        origem_uf: dados.origem_uf,
        origem_bairro: dados.origem_bairro || null,
        origem_lat: dados.origem_lat || null,
        origem_lng: dados.origem_lng || null,
        destino_cidade: dados.destino_cidade,
        destino_uf: dados.destino_uf,
        destino_bairro: dados.destino_bairro || null,
        destino_lat: dados.destino_lat || null,
        destino_lng: dados.destino_lng || null,
        toneladas: dados.toneladas || 0,
        descricao: dados.descricao || null,
        data_carregamento: dados.data_carregamento,
        prazo_entrega: dados.prazo_entrega,
        motorista_nome: dados.motorista_nome || null,
        motorista_telefone: dados.motorista_telefone || null,
        placa_veiculo: dados.placa_veiculo || null,
        distancia_total_km: distanciaTotal,
        status: 'em_transito',
        status_prazo: 'no_prazo',
        velocidade_media_estimada: dados.velocidade_media_estimada || 60,
        ativo: true
      };

      const { data, error } = await withTimeout(
        supabase
          .from('cargas')
          .insert([dadosParaInserir] as any)
          .select()
          .single(),
        15000,
        'Timeout ao cadastrar carga'
      );

      if (error) throw error;
      if (!data) throw new Error('Erro ao criar carga: dados não retornados');

      // Registrar no histórico (não bloqueia)
      supabase.from('historico_status').insert([
        {
          carga_id: (data as any).id,
          status_novo: 'em_transito',
          observacao: 'Carga criada'
        }
      ] as any);

      // Atualizar lista em background (não bloqueia)
      setTimeout(() => fetchCargas(), 100);
      
      return data as Carga;
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

  async function excluirCarga(id: string): Promise<void> {
    try {
      // Soft delete: marca como inativo em vez de deletar fisicamente
      const { error } = await supabase
        .from('cargas')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('historico_status').insert([
        {
          carga_id: id,
          status_novo: 'excluida',
          observacao: 'Carga excluída do sistema'
        }
      ]);

      await fetchCargas();
    } catch (err) {
      console.error('Erro ao excluir carga:', err);
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
    cancelarCarga,
    excluirCarga
  };
}

// Hook para métricas do dashboard
export function useMetricasDashboard(embarcadorId?: string, refreshKey?: number): {
  metricas: MetricasDashboard | null;
  loading: boolean;
  refetch: () => void;
} {
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetricas();
  }, [embarcadorId, refreshKey]);

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

  return { metricas, loading, refetch: fetchMetricas };
}
