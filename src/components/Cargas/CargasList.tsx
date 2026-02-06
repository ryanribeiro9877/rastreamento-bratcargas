// components/Cargas/CargasList.tsx - Lista de Cargas Reutilizável

import type { Carga } from '../../types';
import { StatusBadge } from './CargaStatus';
import { 
  formatarDataHora, 
  formatarToneladas, 
  formatarTempoRelativo,
  formatarDistancia
} from '../../utils/formatters';
import { calcularProgressoEntrega } from '../../utils/calculos';

interface CargasListProps {
  cargas: Carga[];
  onCargaClick?: (carga: Carga) => void;
  onMarcarEntregue?: (cargaId: string) => void;
  showEmbarcador?: boolean;
  showActions?: boolean;
}

export default function CargasList({ 
  cargas, 
  onCargaClick,
  onMarcarEntregue,
  showEmbarcador = false,
  showActions = true
}: CargasListProps) {
  
  if (cargas.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma carga encontrada</h3>
        <p className="mt-1 text-sm text-gray-500">Ajuste os filtros ou aguarde novas cargas.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              NF {showEmbarcador && '/ Embarcador'}
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
            {showActions && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {cargas.map((carga) => {
            const progresso = calcularProgressoEntrega(carga, carga.ultima_posicao);
            
            return (
              <tr
                key={carga.id}
                className="hover:bg-gray-50 transition cursor-pointer"
                onClick={() => onCargaClick?.(carga)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    NF {carga.nota_fiscal}
                  </div>
                  {showEmbarcador && carga.embarcador && (
                    <div className="text-xs text-gray-500">
                      {carga.embarcador.razao_social}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    {formatarToneladas(carga.toneladas)}
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
                  {carga.status === 'em_transito' && (
                    <div className="text-xs text-gray-500">
                      Faltam {progresso.tempoRestante}
                    </div>
                  )}
                  {carga.status === 'entregue' && carga.data_entrega_real && (
                    <div className="text-xs text-green-600">
                      Entregue {formatarTempoRelativo(carga.data_entrega_real)}
                    </div>
                  )}
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  {carga.status === 'aguardando' ? (
                    <div className="text-xs text-blue-600 font-medium">
                      Aguardando motorista
                    </div>
                  ) : (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            carga.status_prazo === 'no_prazo' ? 'bg-green-500' :
                            carga.status_prazo === 'atrasado' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(progresso.percentualPercorrido, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {progresso.percentualPercorrido}% concluído
                      </div>
                      {carga.ultima_posicao && (
                        <div className="text-xs text-gray-400">
                          {formatarTempoRelativo(carga.ultima_posicao.timestamp)}
                        </div>
                      )}
                    </>
                  )}
                </td>
                
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCargaClick?.(carga);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Ver
                    </button>
                    {carga.status === 'em_transito' && onMarcarEntregue && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarcarEntregue(carga.id);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Entregar
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
