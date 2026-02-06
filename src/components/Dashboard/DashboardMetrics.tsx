// components/Dashboard/DashboardMetrics.tsx - Componente de Métricas

import type { MetricasDashboard } from '../../types';
import { formatarToneladas, formatarPercentual, formatarNumero } from '../../utils/formatters';

interface DashboardMetricsProps {
  metricas: MetricasDashboard;
}

export default function DashboardMetrics({ metricas }: DashboardMetricsProps) {
  const cards = [
    {
      titulo: 'Total de Cargas',
      valor: formatarNumero(metricas.total_cargas),
      icone: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      cor: 'blue',
      descricao: `${metricas.cargas_aguardando} aguardando, ${metricas.cargas_em_transito} em trânsito`
    },
    {
      titulo: 'No Prazo',
      valor: formatarNumero(metricas.cargas_no_prazo),
      icone: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      cor: 'green',
      descricao: `${formatarPercentual(metricas.percentual_entrega_prazo)} das entregas`
    },
    {
      titulo: 'Atrasadas',
      valor: formatarNumero(metricas.cargas_atrasadas),
      icone: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      cor: 'red',
      descricao: `${formatarPercentual(metricas.percentual_entrega_atrasada)} das entregas`
    },
    {
      titulo: 'Adiantadas',
      valor: formatarNumero(metricas.cargas_adiantadas),
      icone: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      cor: 'blue',
      descricao: `${formatarPercentual(metricas.percentual_entrega_adiantada)} das entregas`
    },
    {
      titulo: 'Toneladas em Transporte',
      valor: formatarToneladas(metricas.total_toneladas_transporte),
      icone: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      cor: 'yellow',
      descricao: formatarToneladas(metricas.total_toneladas_entregues) + ' entregues'
    }
  ];

  const getColorClasses = (cor: string) => {
    switch (cor) {
      case 'blue':
        return {
          bg: 'bg-[#009440]/10',
          iconBg: 'bg-[#009440]/20',
          iconText: 'text-[#009440]',
          text: 'text-[#009440]'
        };
      case 'green':
        return {
          bg: 'bg-emerald-50',
          iconBg: 'bg-emerald-100',
          iconText: 'text-emerald-600',
          text: 'text-emerald-800'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          iconBg: 'bg-red-100',
          iconText: 'text-red-600',
          text: 'text-red-900'
        };
      case 'yellow':
        return {
          bg: 'bg-[#e6e651]/20',
          iconBg: 'bg-[#e6e651]/30',
          iconText: 'text-[#061735]',
          text: 'text-[#061735]'
        };
      default:
        return {
          bg: 'bg-gray-50',
          iconBg: 'bg-gray-100',
          iconText: 'text-gray-600',
          text: 'text-gray-900'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const cores = getColorClasses(card.cor);
        
        return (
          <div
            key={index}
            className={`${cores.bg} p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`${cores.iconBg} p-3 rounded-lg`}>
                <div className={cores.iconText}>
                  {card.icone}
                </div>
              </div>
            </div>
            
            <div className={`text-3xl font-bold ${cores.text} mb-1`}>
              {card.valor}
            </div>
            
            <div className="text-sm font-medium mb-1 text-gray-600">
              {card.titulo}
            </div>
            
            <div className="text-xs text-gray-500">
              {card.descricao}
            </div>
          </div>
        );
      })}
    </div>
  );
}
