// components/Dashboard/EmbarcadorDashboard.tsx - Dashboard do Embarcador

import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCargas, useMetricasDashboard } from '../../hooks/useCargas';
import { useRealtimeCargas } from '../../hooks/useRealtime';
import DashboardMetrics from './DashboardMetrics';
import FiltrosCargas from '../Filtros/FiltrosCargas';
import MapaRastreamento from '../Mapa/MapaRastreamento';
import CargaStatus, { StatusBadge } from '../Cargas/CargaStatus';
import PerfilModal from '../Usuario/PerfilModal';
import ConfiguracoesModal from '../Usuario/ConfiguracoesModal';
import MinhasCargasModal from '../Usuario/MinhasCargasModal';
import type { FiltrosCargas as FiltrosCargasType, Carga } from '../../types';
import { formatarDataHora, formatarToneladas, formatarTempoRelativo } from '../../utils/formatters';

export default function EmbarcadorDashboard() {
  const { profile, signOut } = useAuth();
  const [filtros, setFiltros] = useState<FiltrosCargasType>({});
  const [cargaSelecionada, setCargaSelecionada] = useState<Carga | null>(null);
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista');
  const [showMenu, setShowMenu] = useState(false);
  const [showPerfil, setShowPerfil] = useState(false);
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [showMinhasCargas, setShowMinhasCargas] = useState(false);
  
  const { cargas, loading, refetch, excluirCarga } = useCargas(profile?.embarcador_id, filtros);
  const { metricas, loading: loadingMetricas, refetch: refetchMetricas } = useMetricasDashboard(profile?.embarcador_id);

  // Realtime - atualizar quando carga mudar
  useRealtimeCargas(profile?.embarcador_id, () => {
    refetch();
  });

  async function handleExcluirCarga(cargaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta carga? Esta ação não pode ser desfeita.')) return;
    
    try {
      await excluirCarga(cargaId);
      refetchMetricas(); // Atualizar métricas após exclusão
      alert('Carga excluída com sucesso!');
      setCargaSelecionada(null);
    } catch (error) {
      alert('Erro ao excluir carga');
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
    <div className="min-h-screen p-4 md:p-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Menu de 3 pontos */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-0 top-full mt-2 w-56 rounded-lg shadow-lg border z-50 animate-fade-in bg-white border-gray-200">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowPerfil(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowConfiguracoes(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configurações
                    </button>
                    <div className="border-t my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowMinhasCargas(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition text-gray-700 hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Minhas Cargas
                    </button>
                    <div className="border-t my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">
              Minhas Cargas
            </h1>
            <p className="text-gray-600">
              {profile?.embarcador?.razao_social}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Métricas */}
      {metricas && <DashboardMetrics metricas={metricas} />}

      {/* Filtros */}
      <FiltrosCargas filtros={filtros} onChange={setFiltros} />

      {/* Toggle View Mode */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 rounded-lg shadow-sm p-1 bg-white`}>
          <button
            onClick={() => setViewMode('lista')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              viewMode === 'lista'
                ? 'bg-[#009440] text-white'
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
                ? 'bg-[#009440] text-white'
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

        </div>

      {/* Conteúdo Principal */}
      {viewMode === 'lista' ? (
        <div className={`rounded-lg shadow overflow-hidden bg-white`}>
          {cargas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className={`mt-2 text-sm font-medium text-gray-900`}>Nenhuma carga encontrada</h3>
              <p className={`mt-1 text-sm text-gray-500`}>Aguarde novas cargas serem cadastradas pela cooperativa.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y divide-gray-200`}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Nota Fiscal
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Rota
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Status
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Motorista
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Prazo Entrega
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500`}>
                      Última Atualização
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y bg-white divide-gray-200`}>
                  {cargas.map((carga) => (
                    <tr
                      key={carga.id}
                      className={`cursor-pointer transition hover:bg-gray-50`}
                      onClick={() => setCargaSelecionada(carga)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium text-gray-900`}>
                          {carga.nota_fiscal}
                        </div>
                        <div className={`text-xs text-gray-500`}>
                          {formatarToneladas(carga.toneladas)}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900`}>
                        <div>{carga.origem_cidade}/{carga.origem_uf}</div>
                        <div className={`text-xs text-gray-500`}>→ {carga.destino_cidade}/{carga.destino_uf}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge statusPrazo={carga.status_prazo} statusCarga={carga.status} />
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900`}>
                        <div>{carga.motorista_nome || '—'}</div>
                        <div className={`text-xs text-gray-500`}>{carga.placa_veiculo || '—'}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900`}>
                        {formatarDataHora(carga.prazo_entrega)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500`}>
                        {carga.ultima_posicao 
                          ? formatarTempoRelativo(carga.ultima_posicao.timestamp)
                          : '—'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-lg shadow p-4 bg-white`} style={{ height: '600px' }}>
          <MapaRastreamento
            cargas={cargas}
            autoRefresh={true}
            onCargaClick={setCargaSelecionada}
          />
        </div>
      )}

      {/* Modal de Detalhes da Carga */}
      {cargaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className={`rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in-scale bg-white`}>
            <div className={`sticky top-0 border-b p-6 flex items-center justify-between bg-white border-gray-200`}>
              <h3 className={`text-2xl font-bold text-gray-900`}>
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

              {/* Informações da Carga */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Origem</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {cargaSelecionada.origem_cidade}/{cargaSelecionada.origem_uf}
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Destino</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {cargaSelecionada.destino_cidade}/{cargaSelecionada.destino_uf}
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Toneladas</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {formatarToneladas(cargaSelecionada.toneladas)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Prazo de Entrega</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {formatarDataHora(cargaSelecionada.prazo_entrega)}
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Motorista</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {cargaSelecionada.motorista_nome || '—'}
                  </div>
                </div>
                <div>
                  <div className={`text-sm font-medium text-gray-500`}>Placa</div>
                  <div className={`text-base font-semibold text-gray-900`}>
                    {cargaSelecionada.placa_veiculo || '—'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleExcluirCarga(cargaSelecionada.id)}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                🗑 Excluir Carga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perfil */}
      {showPerfil && <PerfilModal onClose={() => setShowPerfil(false)} />}

      {/* Modal de Configurações */}
      {showConfiguracoes && <ConfiguracoesModal onClose={() => setShowConfiguracoes(false)} />}

      {/* Modal de Minhas Cargas */}
      {showMinhasCargas && <MinhasCargasModal onClose={() => setShowMinhasCargas(false)} />}

    </div>
  );
}
