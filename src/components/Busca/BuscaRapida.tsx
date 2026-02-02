// components/Busca/BuscaRapida.tsx - Busca em tempo real

import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import type { Carga } from '../../types';
import { formatarDataHora } from '../../utils/formatters';
import { StatusBadge } from '../Cargas/CargaStatus';

interface BuscaRapidaProps {
  onCargaClick: (carga: Carga) => void;
  embarcadorId?: string;
}

export default function BuscaRapida({ onCargaClick, embarcadorId }: BuscaRapidaProps) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Carga[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (busca.length < 3) {
      setResultados([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      buscarCargas();
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [busca]);

  async function buscarCargas() {
    try {
      setLoading(true);

      let query = supabase
        .from('cargas')
        .select('*, embarcador:embarcadores(*)')
        .eq('ativo', true)
        .limit(5);

      // Filtrar por embarcador se fornecido
      if (embarcadorId) {
        query = query.eq('embarcador_id', embarcadorId);
      }

      // Buscar por nota fiscal OU motorista OU placa
      const { data, error } = await query.or(
        `nota_fiscal.ilike.%${busca}%,motorista_nome.ilike.%${busca}%,placa_veiculo.ilike.%${busca}%`
      );

      if (error) throw error;

      setResultados(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectCarga(carga: Carga) {
    onCargaClick(carga);
    setBusca('');
    setShowResults(false);
  }

  return (
    <div className="relative">
      {/* Input de Busca */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onFocus={() => busca.length >= 3 && setShowResults(true)}
          placeholder="Buscar por NF, motorista ou placa..."
          className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        {busca && (
          <button
            onClick={() => {
              setBusca('');
              setShowResults(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Resultados */}
      {showResults && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowResults(false)}
          />

          {/* Lista de Resultados */}
          <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
            {resultados.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {loading ? 'Buscando...' : busca.length < 3 ? 'Digite ao menos 3 caracteres' : 'Nenhuma carga encontrada'}
              </div>
            ) : (
              <div className="py-2">
                {resultados.map((carga) => (
                  <button
                    key={carga.id}
                    onClick={() => handleSelectCarga(carga)}
                    className="w-full px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-gray-900">
                        NF {carga.nota_fiscal}
                      </div>
                      <StatusBadge statusPrazo={carga.status_prazo} statusCarga={carga.status} />
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        📍 {carga.origem_cidade}/{carga.origem_uf} → {carga.destino_cidade}/{carga.destino_uf}
                      </div>
                      
                      {carga.motorista_nome && (
                        <div>
                          👤 {carga.motorista_nome} {carga.placa_veiculo && `• ${carga.placa_veiculo}`}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Prazo: {formatarDataHora(carga.prazo_entrega)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
