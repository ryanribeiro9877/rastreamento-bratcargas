// components/Dashboard/CooperativaDashboard.tsx - Dashboard da Cooperativa (COMPLETO)

import { useState } from 'react';
import { useCargas, useMetricasDashboard } from '../../hooks/useCargas';
import { useRealtimeCargas } from '../../hooks/useRealtime';
import DashboardMetrics from './DashboardMetrics';
import FiltrosCargas from '../Filtros/FiltrosCargas';
import MapaRastreamento from '../Mapa/MapaRastreamento';
import CargaStatus, { StatusBadge } from '../Cargas/CargaStatus';
import CargaForm from '../Cargas/CargaForm';
import type { FiltrosCargas as FiltrosCargasType, Carga } from '../../types';
import { 
  formatarDataHora, 
  formatarToneladas, 
  formatarTempoRelativo,
  formatarDistancia 
} from '../../utils/formatters';
import { calcularProgressoEntrega } from '../../utils/calculos';

export default function CooperativaDashboard() {
  const [filtros, setFiltros] = useState<FiltrosCargasType>({
    // Padrão: mostrar apenas cargas em trânsito
    status: ['em_transito']
  });
  const [cargaSelecionada, setCargaSelecionada] = useState<Carga | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('mapa');
  const [showCadastro, setShowCadastro] = useState(false);
  const [showHistorico, setShowHistorico] = useState(false);

  const { cargas, loading, refetch, marcarComoEntregue } = useCargas(undefined, filtros);
  const { metricas, loading: loadingMetricas } = useMetricasDashboard();

  // Realtime - atualizar quando qualquer carga mudar
  useRealtimeCargas(undefined, () => {
    refetch();
  });

  async function handleMarcarEntregue(cargaId: string) {
    if (!confirm('Confirma que a carga foi entregue?')) return;
    
    try {
      await marcarComoEntregue(cargaId);
      alert('Carga marcada como entregue com sucesso!');
      setCargaSelecionada(null);
    } catch (error) {
      alert('Erro ao marcar carga como entregue');
    }
  }

  function toggleHistorico() {
    setShowHistorico(!showHistorico);
    if (!showHistorico) {
      // Mostrar histórico: todas as cargas entregues
      setFiltros({ status: ['entregue'] });
    } else {
      // Voltar para cargas em trânsito
      setFiltros({ status: ['em_transito'] });
    }
  }

  if (loading || loadingMetricas) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Braticargas - Central de Operações
          </h1>
          <p className="text-gray-600">
            Monitoramento em tempo real de todas as cargas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleHistorico}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition ${
              showHistorico
                ? 'bg-gray-700 text-white hover:bg-gray-800'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showHistorico ? 'Ver Cargas Ativas' : 'Ver Histórico'}
          </button>

          <button
            onClick={() => setShowCadastro(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Carga
          </button>
        </div>
      </div>

      {/* Métricas */}
      {metricas && <DashboardMetrics metricas={metricas} />}

      {/* Filtros */}
      <FiltrosCargas filtros={filtros} onChange={setFiltros} showEmbarcadorFilter={true} />

      {/* Ações Rápidas e Toggle View */}
      <div className="flex items-center justify-between mb-4">
        {/* Ações Rápidas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltros({ status: ['em_transito'] })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            Cargas de Hoje
          </button>
          <button
            onClick={() => setFiltros({ status: ['em_transito'], status_prazo: ['atrasado'] })}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700 transition"
          >
            Atrasadas
          </button>
        </div>

        {/* Toggle View Mode */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-1">
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'lista'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                Lista
              </div>
            </button>
            <button
              onClick={() => setViewMode('mapa')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'mapa'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Mapa
              </div>
            </button>
          </div>

          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {viewMode === 'lista' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {cargas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma carga encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                {showHistorico ? 'Não há cargas entregues no histórico.' : 'Não há cargas ativas no momento.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NF / Embarcador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rota
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motorista / Placa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prazo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progresso
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cargas.map((carga) => {
                    const progresso = calcularProgressoEntrega(carga, carga.ultima_posicao);
                    
                    return (
                      <tr
                        key={carga.id}
                        className="hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            NF {carga.nota_fiscal}
                          </div>
                          <div className="text-xs text-gray-500">
                            {carga.embarcador?.razao_social}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900">
                            {carga.origem_cidade}/{carga.origem_uf}
                          </div>
                          <div className="text-xs text-gray-500">
                            → {carga.destino_cidade}/{carga.destino_uf}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatarDistancia(carga.distancia_total_km)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge statusPrazo={carga.status_prazo} statusCarga={carga.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900">
                            {carga.motorista_nome || '—'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {carga.placa_veiculo || '—'}
                          </div>
                          {carga.motorista_telefone && (
                            <div className="text-xs text-blue-600">
                              {carga.motorista_telefone}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatarDataHora(carga.prazo_entrega)}</div>
                          <div className="text-xs text-gray-500">
                            Faltam {progresso.tempoRestante}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                carga.status_prazo === 'no_prazo' ? 'bg-green-500' :
                                carga.status_prazo === 'atrasado' ? 'bg-red-500' :
                                'bg-blue-500'
                              }`}
                              style={{ width: `${progresso.percentualPercorrido}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {progresso.percentualPercorrido}% concluído
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setCargaSelecionada(carga)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Detalhes
                          </button>
                          {carga.status === 'em_transito' && (
                            <button
                              onClick={() => handleMarcarEntregue(carga.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Marcar Entregue
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4" style={{ height: '700px' }}>
          <MapaRastreamento
            cargas={cargas}
            autoRefresh={true}
            refreshInterval={30000}
            onCargaClick={setCargaSelecionada}
          />
        </div>
      )}

      {/* Modal de Cadastro */}
      {showCadastro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8 relative z-[10000] animate-fade-in-scale">
            <CargaForm
              onSuccess={() => {
                setShowCadastro(false);
                refetch();
              }}
              onCancel={() => setShowCadastro(false)}
            />
          </div>
        </div>
      )}

      {/* Modal de Detalhes (similar ao do embarcador) */}
      {cargaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                Detalhes da Carga - NF {cargaSelecionada.nota_fiscal}
              </h3>
              <button
                onClick={() => setCargaSelecionada(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <CargaStatus 
                statusPrazo={cargaSelecionada.status_prazo} 
                statusCarga={cargaSelecionada.status}
                size="lg"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Embarcador</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.embarcador?.razao_social}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Nota Fiscal</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.nota_fiscal}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Origem</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.origem_cidade}/{cargaSelecionada.origem_uf}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Destino</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.destino_cidade}/{cargaSelecionada.destino_uf}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Motorista</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.motorista_nome || '—'}
                  </div>
                  <div className="text-sm text-blue-600">
                    {cargaSelecionada.motorista_telefone || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Placa</div>
                  <div className="text-base font-semibold text-gray-900">
                    {cargaSelecionada.placa_veiculo || '—'}
                  </div>
                </div>
              </div>

              {cargaSelecionada.status === 'em_transito' && (
                <button
                  onClick={() => handleMarcarEntregue(cargaSelecionada.id)}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                >
                  ✓ Marcar como Entregue
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
