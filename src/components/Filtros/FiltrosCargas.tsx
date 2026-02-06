// components/Filtros/FiltrosCargas.tsx - Componente de Filtros

import { useState } from 'react';
import type { FiltrosCargas, StatusCarga, StatusPrazo } from '../../types';
import { UFS } from '../../utils/formatters';

interface FiltrosCargasProps {
  filtros: FiltrosCargas;
  onChange: (filtros: FiltrosCargas) => void;
  showEmbarcadorFilter?: boolean;
}

export default function FiltrosCargasComponent({ 
  filtros, 
  onChange,
  showEmbarcadorFilter = false
}: FiltrosCargasProps) {
  const [expanded, setExpanded] = useState(false);

  function handleChange(field: keyof FiltrosCargas, value: any) {
    onChange({ ...filtros, [field]: value });
  }

  function handleStatusToggle(status: StatusCarga) {
    const current = filtros.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    handleChange('status', updated);
  }

  function handleStatusPrazoToggle(status: StatusPrazo) {
    const current = filtros.status_prazo || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    handleChange('status_prazo', updated);
  }

  function limparFiltros() {
    onChange({});
  }

  const filtrosAtivos = Object.keys(filtros).filter(key => {
    const valor = filtros[key as keyof FiltrosCargas];
    if (Array.isArray(valor)) return valor.length > 0;
    return !!valor;
  }).length;

  return (
    <div className="rounded-lg shadow-sm border mb-6 bg-white border-gray-200">
      {/* Header do Filtro */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            {filtrosAtivos > 0 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#009440]/20 text-[#009440]">
                {filtrosAtivos} {filtrosAtivos === 1 ? 'ativo' : 'ativos'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {filtrosAtivos > 0 && (
              <button
                onClick={limparFiltros}
                className="text-sm font-medium text-[#009440] hover:text-[#007a35]"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded transition hover:bg-gray-100"
            >
              <svg
                className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''} text-gray-600`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Filtros Rápidos - Sempre Visíveis */}
      <div className="p-4 border-b bg-gray-50 border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Status da Carga */}
          <button
            onClick={() => handleStatusToggle('aguardando')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              (filtros.status || []).includes('aguardando')
                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Aguardando
          </button>
          <button
            onClick={() => handleStatusToggle('em_transito')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              (filtros.status || []).includes('em_transito')
                ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Em Trânsito
          </button>

          {/* Status de Prazo */}
          <button
            onClick={() => handleStatusPrazoToggle('no_prazo')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              (filtros.status_prazo || []).includes('no_prazo')
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            No Prazo
          </button>

          <button
            onClick={() => handleStatusPrazoToggle('atrasado')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              (filtros.status_prazo || []).includes('atrasado')
                ? 'bg-red-100 text-red-800 border-2 border-red-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Atrasado
          </button>

          <button
            onClick={() => handleStatusPrazoToggle('adiantado')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              (filtros.status_prazo || []).includes('adiantado')
                ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Adiantado
          </button>
        </div>
      </div>

      {/* Filtros Avançados - Expansíveis */}
      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Nota Fiscal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota Fiscal
              </label>
              <input
                type="text"
                value={filtros.nota_fiscal || ''}
                onChange={(e) => handleChange('nota_fiscal', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Digite a NF"
              />
            </div>

            {/* Origem UF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Origem (UF)
              </label>
              <select
                value={filtros.origem_uf || ''}
                onChange={(e) => handleChange('origem_uf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {UFS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Destino UF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destino (UF)
              </label>
              <select
                value={filtros.destino_uf || ''}
                onChange={(e) => handleChange('destino_uf', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {UFS.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Motorista */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motorista
              </label>
              <input
                type="text"
                value={filtros.motorista_nome || ''}
                onChange={(e) => handleChange('motorista_nome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nome do motorista"
              />
            </div>

            {/* Placa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placa
              </label>
              <input
                type="text"
                value={filtros.placa_veiculo || ''}
                onChange={(e) => handleChange('placa_veiculo', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ABC-1234"
              />
            </div>

            {/* Data Carregamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carregamento (De)
              </label>
              <input
                type="date"
                value={filtros.data_carregamento_inicio || ''}
                onChange={(e) => handleChange('data_carregamento_inicio', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carregamento (Até)
              </label>
              <input
                type="date"
                value={filtros.data_carregamento_fim || ''}
                onChange={(e) => handleChange('data_carregamento_fim', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
