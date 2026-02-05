// components/Cooperativa/CargasModal.tsx - Modal de todas as cargas para cooperativa

import { useState } from 'react';
import { useCargas } from '../../hooks/useCargas';
import { formatarData, formatarToneladas } from '../../utils/formatters';
import type { Carga } from '../../types';

interface CargasModalProps {
  onClose: () => void;
}

export default function CargasModal({ onClose }: CargasModalProps) {
  const isDark = false; // Tema fixo claro
  const { cargas, loading, marcarComoEntregue, excluirCarga } = useCargas(undefined, {});
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [busca, setBusca] = useState('');

  const getStatusColor = (carga: Carga) => {
    if (carga.status === 'entregue') return 'bg-green-100 text-green-800';
    if (carga.status === 'cancelada') return 'bg-gray-100 text-gray-800';
    if (carga.status === 'aguardando_data') return 'bg-orange-100 text-orange-800';
    
    switch (carga.status_prazo) {
      case 'no_prazo': return 'bg-green-100 text-green-800';
      case 'atrasado': return 'bg-red-100 text-red-800';
      case 'adiantado': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (carga: Carga) => {
    if (carga.status === 'entregue') return 'Entregue';
    if (carga.status === 'cancelada') return 'Cancelada';
    if (carga.status === 'aguardando_data') return 'Aguardando Data';
    
    switch (carga.status_prazo) {
      case 'no_prazo': return 'No Prazo';
      case 'atrasado': return 'Atrasado';
      case 'adiantado': return 'Adiantado';
      default: return 'Em Trânsito';
    }
  };

  const cargasFiltradas = cargas.filter(carga => {
    // Filtro de status
    if (filtroStatus !== 'todos') {
      if (filtroStatus === 'em_transito' && carga.status !== 'em_transito') return false;
      if (filtroStatus === 'entregue' && carga.status !== 'entregue') return false;
      if (filtroStatus === 'aguardando_data' && carga.status !== 'aguardando_data') return false;
    }
    
    // Filtro de busca
    if (busca) {
      const termoBusca = busca.toLowerCase();
      return (
        carga.nota_fiscal?.toLowerCase().includes(termoBusca) ||
        carga.embarcador?.razao_social?.toLowerCase().includes(termoBusca) ||
        carga.origem_cidade?.toLowerCase().includes(termoBusca) ||
        carga.destino_cidade?.toLowerCase().includes(termoBusca) ||
        carga.motorista_nome?.toLowerCase().includes(termoBusca)
      );
    }
    
    return true;
  });

  async function handleMarcarEntregue(cargaId: string) {
    if (!confirm('Confirma que a carga foi entregue?')) return;
    try {
      await marcarComoEntregue(cargaId);
      alert('Carga marcada como entregue!');
    } catch (error) {
      alert('Erro ao marcar carga como entregue');
    }
  }

  async function handleExcluirCarga(cargaId: string) {
    if (!confirm('Tem certeza que deseja excluir esta carga?')) return;
    try {
      await excluirCarga(cargaId);
      alert('Carga excluída com sucesso!');
    } catch (error) {
      alert('Erro ao excluir carga');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className={`rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-fade-in-scale ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header */}
        <div className={`sticky top-0 border-b p-6 flex items-center justify-between ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Todas as Cargas
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {cargasFiltradas.length} carga{cargasFiltradas.length !== 1 ? 's' : ''} encontrada{cargasFiltradas.length !== 1 ? 's' : ''}
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

        {/* Filtros */}
        <div className={`p-4 border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Buscar por NF, empresa, cidade, motorista..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
              />
            </div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="todos">Todos os Status</option>
              <option value="em_transito">Em Trânsito</option>
              <option value="entregue">Entregues</option>
              <option value="aguardando_data">Aguardando Data</option>
            </select>
          </div>
        </div>

        {/* Lista de Cargas */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : cargasFiltradas.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className={`mt-2 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Nenhuma carga encontrada</h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Tente ajustar os filtros de busca.
              </p>
            </div>
          ) : (
            <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {cargasFiltradas.map((carga) => (
                <div key={carga.id} className={`p-4 transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Empresa em destaque */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {carga.embarcador?.razao_social || 'Empresa não identificada'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(carga)}`}>
                          {getStatusLabel(carga)}
                        </span>
                      </div>

                      {/* NF e Rota */}
                      <div className={`flex items-center gap-4 text-sm mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        <span className="font-medium">NF: {carga.nota_fiscal}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{carga.origem_cidade}/{carga.origem_uf}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
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
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Motorista</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {carga.motorista_nome || '—'}
                          </span>
                        </div>
                        <div>
                          <span className={`block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Toneladas</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {formatarToneladas(carga.toneladas)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      {carga.status === 'em_transito' && (
                        <button
                          onClick={() => handleMarcarEntregue(carga.id)}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition"
                        >
                          Marcar Entregue
                        </button>
                      )}
                      <button
                        onClick={() => handleExcluirCarga(carga.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
