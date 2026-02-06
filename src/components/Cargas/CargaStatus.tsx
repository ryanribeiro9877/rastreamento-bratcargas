// components/Cargas/CargaStatus.tsx - Componente de Status Visual (Semáforo)

import type { StatusPrazo, StatusCarga } from '../../types';
import { getCorStatusPrazo, getLabelStatusPrazo, getCorStatusCarga, getLabelStatusCarga } from '../../utils/formatters';

interface CargaStatusProps {
  statusPrazo: StatusPrazo;
  statusCarga: StatusCarga;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function CargaStatus({ 
  statusPrazo, 
  statusCarga,
  size = 'md',
  showLabel = true 
}: CargaStatusProps) {
  const cores = getCorStatusPrazo(statusPrazo);
  const label = getLabelStatusPrazo(statusPrazo);
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  const dotClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  // Ícone de caminhão com cor baseada no status
  const getIconColor = () => {
    switch (statusPrazo) {
      case 'no_prazo':
        return 'text-green-600';
      case 'atrasado':
        return 'text-red-600';
      case 'adiantado':
        return 'text-blue-600';
      case 'aguardando_data':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getBgColor = () => {
    switch (statusPrazo) {
      case 'no_prazo':
        return 'bg-green-100';
      case 'atrasado':
        return 'bg-red-100';
      case 'adiantado':
        return 'bg-blue-100';
      case 'aguardando_data':
        return 'bg-orange-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (statusCarga === 'aguardando') {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        {showLabel && (
          <div>
            <div className="font-semibold text-blue-700">Aguardando</div>
            <div className="text-xs text-gray-500">Aguardando motorista</div>
          </div>
        )}
      </div>
    );
  }

  if (statusCarga === 'entregue') {
    return (
      <div className="inline-flex items-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {showLabel && (
          <div>
            <div className="font-semibold text-green-700">Entregue</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {/* Ícone de Caminhão com Semáforo */}
      <div className={`relative flex items-center justify-center ${dotClasses[size]} ${getBgColor()} rounded-full`}>
        <svg 
          className={`${sizeClasses[size] === 'w-6 h-6' ? 'w-8 h-8' : 'w-6 h-6'} ${getIconColor()}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" 
          />
        </svg>
        
        {/* Indicador de status (ponto colorido) */}
        <div className={`absolute -top-1 -right-1 ${sizeClasses[size]} rounded-full border-2 border-white ${
          statusPrazo === 'no_prazo' ? 'bg-green-500' :
          statusPrazo === 'atrasado' ? 'bg-red-500' :
          statusPrazo === 'aguardando_data' ? 'bg-orange-500' :
          'bg-blue-500'
        }`} />
      </div>

      {showLabel && (
        <div>
          <div className={`font-semibold ${cores.text}`}>
            {label}
          </div>
          <div className="text-xs text-gray-500">
            {getLabelStatusCarga(statusCarga)}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Badge simples para uso em tabelas
export function StatusBadge({ 
  statusPrazo,
  statusCarga 
}: { 
  statusPrazo: StatusPrazo;
  statusCarga: StatusCarga;
}) {
  const cores = getCorStatusPrazo(statusPrazo);
  const label = getLabelStatusPrazo(statusPrazo);
  
  if (statusCarga === 'aguardando') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
        Aguardando
      </span>
    );
  }

  if (statusCarga === 'entregue') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
        Entregue
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${cores.badge}`}>
      <span className={`w-2 h-2 rounded-full mr-2 ${
        statusPrazo === 'no_prazo' ? 'bg-green-500' :
        statusPrazo === 'atrasado' ? 'bg-red-500' :
        statusPrazo === 'aguardando_data' ? 'bg-orange-500' :
        'bg-blue-500'
      }`} />
      {label}
    </span>
  );
}
