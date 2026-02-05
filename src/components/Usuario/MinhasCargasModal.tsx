// components/Usuario/MinhasCargasModal.tsx - Modal de Minhas Cargas

import { useAuth } from '../../hooks/useAuth';
import { useCargas } from '../../hooks/useCargas';
import { formatarData, formatarToneladas, getLabelStatusCarga, getLabelStatusPrazo, getCorStatusPrazo } from '../../utils/formatters';
import type { Carga } from '../../types';

interface MinhasCargasModalProps {
  onClose: () => void;
}

export default function MinhasCargasModal({ onClose }: MinhasCargasModalProps) {
  const isDark = false; // Tema fixo claro
  const { profile } = useAuth();
  const { cargas, loading } = useCargas(profile?.embarcador_id, {});

  const getStatusColor = (carga: Carga) => {
    if (carga.status === 'entregue') return 'bg-green-100 text-green-800';
    if (carga.status === 'cancelada') return 'bg-gray-100 text-gray-800';
    if (carga.status === 'aguardando_data') return 'bg-orange-100 text-orange-800';
    
    switch (carga.status_prazo) {
      case 'no_prazo': return 'bg-green-100 text-green-800';
      case 'atrasado': return 'bg-red-100 text-red-800';
      case 'adiantado': return 'bg-blue-100 text-blue-800';
      case 'aguardando_data': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (carga: Carga) => {
    if (carga.status === 'entregue') return 'Entregue';
    if (carga.status === 'cancelada') return 'Cancelada';
    if (carga.status === 'aguardando_data') return 'Aguardando Data';
    return getLabelStatusPrazo(carga.status_prazo);
  };

  const getStatusIcon = (carga: Carga) => {
    if (carga.status === 'entregue') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    if (carga.status === 'aguardando_data' || carga.status_prazo === 'aguardando_data') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (carga.status_prazo === 'atrasado') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-fade-in-scale ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Minhas Cargas
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {cargas.length} carga{cargas.length !== 1 ? 's' : ''} registrada{cargas.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className={isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : cargas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Nenhuma carga encontrada</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Aguarde novas cargas serem cadastradas pela cooperativa.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {cargas.map((carga) => (
                <div key={carga.id} className={`p-4 transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          NF: {carga.nota_fiscal}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(carga)}`}>
                          {getStatusIcon(carga)}
                          {getStatusLabel(carga)}
                        </span>
                      </div>

                      {/* Rota */}
                      <div className={`flex items-center gap-2 text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{carga.origem_cidade}/{carga.origem_uf}</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span>{carga.destino_cidade}/{carga.destino_uf}</span>
                        </div>
                      </div>

                      {/* Grid de Informações */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Data de Saída</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatarData(carga.data_carregamento)}
                          </span>
                        </div>
                        <div>
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Prazo de Entrega</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatarData(carga.prazo_entrega)}
                          </span>
                        </div>
                        <div>
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Toneladas</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatarToneladas(carga.toneladas)}
                          </span>
                        </div>
                        <div>
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Tipo de Carga</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {carga.descricao || 'Não especificado'}
                          </span>
                        </div>
                      </div>

                      {/* Motorista */}
                      {carga.motorista_nome && (
                        <div className={`mt-3 pt-3 border-t ${isDark ? 'border-gray-600' : 'border-gray-100'}`}>
                          <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Motorista: <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{carga.motorista_nome}</span>
                            {carga.placa_veiculo && (
                              <span className="ml-2 text-gray-400">| Placa: {carga.placa_veiculo}</span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legenda de Status */}
        <div className={`border-t p-4 ${isDark ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Legenda de Status:</p>
          <div className={`flex flex-wrap gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              No Prazo / Entregue
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Atrasado
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Adiantado
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Aguardando Data
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
