// hooks/useCargas.ts - Hook para gerenciar cargas

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import type { Carga, CargaFormData, FiltrosCargas, MetricasDashboard } from '../types';
import { calcularDistanciaTotal, calcularStatusPrazo } from '../utils/calculos';

// Helper: obter token de sessão do localStorage (instantâneo, sem await)
function getAccessTokenSync(): string | null {
  try {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token'));
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.access_token || null;
  } catch {
    return null;
  }
}

export function useCargas(embarcadorId?: string, filtros?: FiltrosCargas) {
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusPrazoAnteriorRef = useRef<Record<string, string>>({});
  const notificacoesEnviadasRef = useRef<Set<string>>(new Set());

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
      if (isInitialLoad) setLoading(true);
      setError(null);

      const token = getAccessTokenSync();
      if (!token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const filtrosObj = filtros || {};

      // Construir query params
      const params = new URLSearchParams();
      params.set('select', '*,embarcador:embarcadores(*),posicoes:posicoes_gps(*)');
      params.set('ativo', 'eq.true');
      params.set('order', 'created_at.desc');

      if (embarcadorId) {
        params.set('embarcador_id', `eq.${embarcadorId}`);
      }
      if (filtrosObj.status && filtrosObj.status.length > 0) {
        params.set('status', `in.(${filtrosObj.status.join(',')})`);
      }
      if (filtrosObj.status_prazo && filtrosObj.status_prazo.length > 0) {
        params.set('status_prazo', `in.(${filtrosObj.status_prazo.join(',')})`);
      }
      if (filtrosObj.nota_fiscal) {
        params.set('nota_fiscal', `ilike.*${filtrosObj.nota_fiscal}*`);
      }
      if (filtrosObj.origem_uf) {
        params.set('origem_uf', `eq.${filtrosObj.origem_uf}`);
      }
      if (filtrosObj.destino_uf) {
        params.set('destino_uf', `eq.${filtrosObj.destino_uf}`);
      }
      if (filtrosObj.motorista_nome) {
        params.set('motorista_nome', `ilike.*${filtrosObj.motorista_nome}*`);
      }
      if (filtrosObj.placa_veiculo) {
        params.set('placa_veiculo', `ilike.*${filtrosObj.placa_veiculo}*`);
      }
      if (filtrosObj.data_carregamento_inicio) {
        params.set('data_carregamento', `gte.${filtrosObj.data_carregamento_inicio}`);
      }
      if (filtrosObj.data_carregamento_fim) {
        params.append('data_carregamento', `lte.${filtrosObj.data_carregamento_fim}`);
      }
      if (filtrosObj.prazo_entrega_inicio) {
        params.set('prazo_entrega', `gte.${filtrosObj.prazo_entrega_inicio}`);
      }
      if (filtrosObj.prazo_entrega_fim) {
        params.append('prazo_entrega', `lte.${filtrosObj.prazo_entrega_fim}`);
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/cargas?${params.toString()}`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao buscar cargas: ${response.status} - ${errBody}`);
      }

      const data = await response.json();

      // Processar cargas: extrair última posição do array de posições
      const cargasProcessadas = (data || []).map((carga: any) => {
        const posicoes = carga.posicoes || [];
        // Ordenar por timestamp desc e pegar a primeira
        const ultimaPosicao = posicoes.length > 0
          ? posicoes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : undefined;

        return {
          ...carga,
          embarcador: carga.embarcador ?? undefined,
          ultima_posicao: ultimaPosicao,
          posicoes: undefined
        } as Carga;
      });

      setCargas(cargasProcessadas);

      // Detectar mudanças de status_prazo e notificar empresa por email
      const supabaseKeyForNotif = import.meta.env.VITE_SUPABASE_ANON_KEY;
      for (const c of cargasProcessadas) {
        if (c.status !== 'em_transito') continue;
        const statusPrazoCalculado = calcularStatusPrazo(c, c.ultima_posicao);
        const statusAnterior = statusPrazoAnteriorRef.current[c.id] || c.status_prazo || 'no_prazo';
        const chaveNotif = `${c.id}_${statusPrazoCalculado}`;

        if (statusPrazoCalculado !== statusAnterior && !notificacoesEnviadasRef.current.has(chaveNotif)) {
          notificacoesEnviadasRef.current.add(chaveNotif);
          // Atualizar status_prazo no banco
          fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${c.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status_prazo: statusPrazoCalculado })
          }).catch(() => {});
          // Enviar notificação por email
          fetch(`${supabaseUrl}/functions/v1/notificar-status-carga`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKeyForNotif}`,
            },
            body: JSON.stringify({ carga_id: c.id, status: statusPrazoCalculado })
          }).catch(() => {});
        }
        statusPrazoAnteriorRef.current[c.id] = statusPrazoCalculado;
      }
    } catch (err) {
      console.error('Erro ao buscar cargas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
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
        status: 'aguardando',
        status_prazo: 'no_prazo',
        velocidade_media_estimada: dados.velocidade_media_estimada || 60,
        ativo: true
      };

      const { data, error } = await supabase
        .from('cargas')
        .insert([dadosParaInserir] as any)
        .select()
        .single();

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

  async function getAuthHeaders() {
    const token = getAccessTokenSync();
    if (!token) throw new Error('Usuário não autenticado');
    return {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`
    };
  }

  async function atualizarCarga(id: string, dados: Partial<CargaFormData>): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(dados)
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao atualizar carga: ${response.status} - ${errBody}`);
      }

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

      const headers = await getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'entregue',
          data_entrega_real: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao marcar como entregue: ${response.status} - ${errBody}`);
      }

      // Registrar no histórico
      fetch(`${supabaseUrl}/rest/v1/historico_status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          carga_id: id,
          status_anterior: carga.status,
          status_novo: 'entregue',
          observacao: 'Carga entregue'
        })
      }).catch(err => console.error('Erro ao registrar histórico:', err));

      // Notificar empresa por email sobre entrega (fire-and-forget)
      fetch(`${supabaseUrl}/functions/v1/notificar-status-carga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ carga_id: id, status: 'entregue' })
      }).catch(() => {});

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

      const headers = await getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'cancelada' })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Erro ao cancelar carga: ${response.status} - ${errBody}`);
      }

      // Registrar no histórico
      fetch(`${supabaseUrl}/rest/v1/historico_status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          carga_id: id,
          status_anterior: carga.status,
          status_novo: 'cancelada',
          observacao: motivo
        })
      }).catch(err => console.error('Erro ao registrar histórico:', err));

      await fetchCargas();
    } catch (err) {
      console.error('Erro ao cancelar carga:', err);
      throw err;
    }
  }

  async function excluirCarga(id: string): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Excluir alertas relacionados
      await fetch(`${supabaseUrl}/rest/v1/alertas?carga_id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      // Excluir posições GPS relacionadas
      await fetch(`${supabaseUrl}/rest/v1/posicoes_gps?carga_id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      // Excluir histórico de status relacionado
      await fetch(`${supabaseUrl}/rest/v1/historico_status?carga_id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      // Excluir a carga permanentemente
      const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${id}`, {
        method: 'DELETE',
        headers
      });

      if (!deleteResponse.ok) {
        const errBody = await deleteResponse.text();
        throw new Error(`Erro ao excluir carga: ${deleteResponse.status} - ${errBody}`);
      }

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

      const headers = await getAuthHeaders();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      fetch(`${supabaseUrl}/rest/v1/alertas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          carga_id: cargaId,
          tipo: 'entrega',
          destinatario: 'embarcador',
          mensagem: `Carga NF ${carga.nota_fiscal} foi entregue com sucesso!`,
          enviado: false
        })
      }).catch(err => console.error('Erro ao disparar alerta:', err));
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

      const token = getAccessTokenSync();
      if (!token) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      let queryStr = `${supabaseUrl}/rest/v1/cargas?select=status,status_prazo,toneladas&ativo=eq.true`;
      if (embarcadorId) {
        queryStr += `&embarcador_id=eq.${embarcadorId}`;
      }

      const response = await fetch(queryStr, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar métricas');

      const cargas = await response.json();
      const total = cargas?.length || 0;
      const aguardando = cargas?.filter((c) => c.status === 'aguardando').length || 0;
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
        cargas_aguardando: aguardando,
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
