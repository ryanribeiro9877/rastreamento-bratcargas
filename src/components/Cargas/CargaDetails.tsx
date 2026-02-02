// components/Cargas/CargaDetails.tsx - Detalhes Completos da Carga (Modal)

import { useState, useEffect } from 'react';
import type { Carga, PosicaoGPS, HistoricoStatus } from '../../types';
import CargaStatus from './CargaStatus';
import { supabase } from '../../services/supabase';
import { 
  formatarDataHora, 
  formatarToneladas, 
  formatarDistancia,
  formatarVelocidade,
  formatarTempoRelativo
} from '../../utils/formatters';
import { calcularProgressoEntrega, calcularVelocidadeMedia } from '../../utils/calculos';

interface CargaDetailsProps {
  carga: Carga;
  onClose: () => void;
  onMarcarEntregue?: (cargaId: string) => void;
  showActions?: boolean;
}

export default function CargaDetails({ 
  carga, 
  onClose,
  onMarcarEntregue,
  showActions = true
}: CargaDetailsProps) {
  const [posicoes, setPosicoes] = useState<PosicaoGPS[]>([]);
  const [historico, setHistorico] = useState<HistoricoStatus[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'posicoes' | 'historico'>('info');
  const [loading, setLoading] = useState(true);

  const progresso = calcularProgressoEntrega(carga, carga.ultima_posicao);

  useEffect(() => {
    carregarDados();
  }, [carga.id]);

  async function carregarDados() {
    try {
      setLoading(true);

      // Buscar posições GPS
      const { data: posicoesData } = await supabase
        .from('posicoes_gps')
        .select('*')
        .eq('carga_id', carga.id)
        .order('timestamp', { ascending: false })
        .limit(50);

      setPosicoes(posicoesData || []);

      // Buscar histórico de status
      const { data: historicoData } = await supabase
        .from('historico_status')
        .select('*')
        .eq('carga_id', carga.id)
        .order('created_at', { ascending: false });

      setHistorico(historicoData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  const velocidadeMedia = posicoes.length > 1 ? calcularVelocidadeMedia(posicoes) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nota Fiscal {carga.nota_fiscal}
            </h2>
            {carga.embarcador && (
              <p className="text-sm text-gray-600">{carga.embarcador.razao_social}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'info'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Informações
            </button>
            <button
              onClick={() => setActiveTab('posicoes')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'posicoes'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Posições GPS ({posicoes.length})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`px-6 py-3 text-sm font-medium transition ${
                activeTab === 'historico'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Histórico ({historico.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <CargaStatus 
                  statusPrazo={carga.status_prazo} 
                  statusCarga={carga.status}
                  size="lg"
                />
                
                {carga.status === 'em_transito' && showActions && onMarcarEntregue && (
                  <button
                    onClick={() => onMarcarEntregue(carga.id)}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
                  >
                    ✓ Marcar como Entregue
                  </button>
                )}
              </div>

              {/* Progresso */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progresso da Entrega</span>
                  <span className="text-sm font-bold text-gray-900">{progresso.percentualPercorrido}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      carga.status_prazo === 'no_prazo' ? 'bg-green-500' :
                      carga.status_prazo === 'atrasado' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(progresso.percentualPercorrido, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Percorrido</div>
                    <div className="font-semibold">{formatarDistancia(progresso.distanciaPercorrida)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Restante</div>
                    <div className="font-semibold">{formatarDistancia(progresso.distanciaRestante)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Tempo Restante</div>
                    <div className="font-semibold">{progresso.tempoRestante}</div>
                  </div>
                </div>
              </div>

              {/* Informações da Carga */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados da Carga</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Nota Fiscal" value={carga.nota_fiscal} />
                  <InfoField label="Toneladas" value={formatarToneladas(carga.toneladas)} />
                  <InfoField 
                    label="Descrição" 
                    value={carga.descricao || '—'} 
                    className="col-span-2"
                  />
                </div>
              </div>

              {/* Rota */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Rota</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">📍 Origem</div>
                    <div className="text-base font-semibold text-gray-900">
                      {carga.origem_cidade}/{carga.origem_uf}
                    </div>
                    {carga.origem_lat && carga.origem_lng && (
                      <div className="text-xs text-gray-500 mt-1">
                        {carga.origem_lat.toFixed(6)}, {carga.origem_lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">🎯 Destino</div>
                    <div className="text-base font-semibold text-gray-900">
                      {carga.destino_cidade}/{carga.destino_uf}
                    </div>
                    {carga.destino_lat && carga.destino_lng && (
                      <div className="text-xs text-gray-500 mt-1">
                        {carga.destino_lat.toFixed(6)}, {carga.destino_lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                  <InfoField 
                    label="Distância Total" 
                    value={formatarDistancia(carga.distancia_total_km)} 
                  />
                  <InfoField 
                    label="Velocidade Média" 
                    value={velocidadeMedia > 0 ? formatarVelocidade(velocidadeMedia) : formatarVelocidade(carga.velocidade_media_estimada)}
                  />
                </div>
              </div>

              {/* Prazos */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prazos</h3>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField 
                    label="Data de Carregamento" 
                    value={formatarDataHora(carga.data_carregamento)} 
                  />
                  <InfoField 
                    label="Prazo de Entrega" 
                    value={formatarDataHora(carga.prazo_entrega)} 
                  />
                  {carga.data_entrega_real && (
                    <InfoField 
                      label="Data de Entrega Real" 
                      value={formatarDataHora(carga.data_entrega_real)}
                      className="col-span-2"
                    />
                  )}
                </div>
              </div>

              {/* Motorista */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Motorista e Veículo</h3>
                <div className="grid grid-cols-3 gap-4">
                  <InfoField label="Motorista" value={carga.motorista_nome || '—'} />
                  <InfoField label="Telefone" value={carga.motorista_telefone || '—'} />
                  <InfoField label="Placa" value={carga.placa_veiculo || '—'} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'posicoes' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 mt-2">Carregando posições...</p>
                </div>
              ) : posicoes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nenhuma posição GPS registrada ainda.</p>
                </div>
              ) : (
                posicoes.map((posicao, index) => (
                  <div key={posicao.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-gray-900">
                            #{posicoes.length - index}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            posicao.origem === 'api_rastreamento' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-200 text-gray-800'
                          }`}>
                            {posicao.origem === 'api_rastreamento' ? 'Automático' : 'Manual'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Coordenadas:</span>
                            <span className="ml-2 font-mono text-gray-900">
                              {posicao.latitude.toFixed(6)}, {posicao.longitude.toFixed(6)}
                            </span>
                          </div>
                          {posicao.velocidade && (
                            <div>
                              <span className="text-gray-500">Velocidade:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {formatarVelocidade(posicao.velocidade)}
                              </span>
                            </div>
                          )}
                          {posicao.precisao_metros && (
                            <div>
                              <span className="text-gray-500">Precisão:</span>
                              <span className="ml-2 text-gray-900">
                                ±{Math.round(posicao.precisao_metros)}m
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Registrado:</span>
                            <span className="ml-2 text-gray-900">
                              {formatarTempoRelativo(posicao.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-gray-600 mt-2">Carregando histórico...</p>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Nenhum histórico registrado.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  
                  {historico.map((item, index) => (
                    <div key={item.id} className="relative flex gap-4 pb-6">
                      <div className="relative z-10">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-semibold text-gray-900">
                              {item.status_novo.replace('_', ' ').toUpperCase()}
                            </span>
                            {item.status_anterior && (
                              <span className="text-sm text-gray-500 ml-2">
                                (era: {item.status_anterior.replace('_', ' ')})
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatarTempoRelativo(item.created_at)}
                          </span>
                        </div>
                        {item.observacao && (
                          <p className="text-sm text-gray-600">{item.observacao}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para campos de informação
function InfoField({ 
  label, 
  value, 
  className = '' 
}: { 
  label: string; 
  value: string; 
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-900">{value}</div>
    </div>
  );
}
