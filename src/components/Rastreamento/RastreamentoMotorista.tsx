// components/Rastreamento/RastreamentoMotorista.tsx - Página Pública para Motorista

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { rastreamentoService } from '../../services/rastreamento';
import type { Carga } from '../../types';
import { formatarDataHora } from '../../utils/formatters';

export default function RastreamentoMotorista() {
  const { token } = useParams<{ token: string }>();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rastreando, setRastreando] = useState(false);
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  useEffect(() => {
    carregarCarga();
  }, [token]);

  async function carregarCarga() {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Buscar carga pelo token
      const { data, error: fetchError } = await supabase
        .from('cargas')
        .select('*, embarcador:embarcadores(*)')
        .eq('link_rastreamento', token)
        .single();

      if (fetchError) throw fetchError;

      if (!data) {
        throw new Error('Carga não encontrada ou link expirado');
      }

      setCarga(data);
    } catch (err: any) {
      console.error('Erro ao carregar carga:', err);
      setError(err.message || 'Erro ao carregar informações da carga');
    } finally {
      setLoading(false);
    }
  }

  async function iniciarRastreamento() {
    if (!token || !carga) return;

    try {
      setError('');
      setPermissaoNegada(false);

      // Solicitar permissão de localização
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        setPermissaoNegada(true);
        setError('Permissão de localização negada. Por favor, habilite nas configurações do navegador.');
        return;
      }

      // Iniciar rastreamento
      await rastreamentoService.capturarLocalizacaoMotorista(token);
      setRastreando(true);
      setUltimaAtualizacao(new Date());

      alert('Rastreamento iniciado com sucesso! Sua localização será enviada automaticamente.');
    } catch (err: any) {
      console.error('Erro ao iniciar rastreamento:', err);
      setError(err.message || 'Erro ao iniciar rastreamento');
      setPermissaoNegada(err.message?.includes('Geolocalização não suportada'));
    }
  }

  function pararRastreamento() {
    if (!carga) return;
    rastreamentoService.pararRastreamento(carga.id);
    setRastreando(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações...</p>
        </div>
      </div>
    );
  }

  if (error && !carga) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
          >
            Voltar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white p-3 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Rastreamento de Carga</h1>
                <p className="text-blue-100">Braticargas</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Informações da Carga */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <div className="text-sm text-gray-500">Nota Fiscal</div>
                  <div className="text-2xl font-bold text-gray-900">{carga?.nota_fiscal}</div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  carga?.status === 'em_transito' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {carga?.status === 'em_transito' ? 'Em Trânsito' : 'Entregue'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Origem</div>
                  <div className="font-semibold text-gray-900">
                    {carga?.origem_cidade}/{carga?.origem_uf}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Destino</div>
                  <div className="font-semibold text-gray-900">
                    {carga?.destino_cidade}/{carga?.destino_uf}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Prazo de Entrega</div>
                  <div className="font-semibold text-gray-900">
                    {carga?.prazo_entrega && formatarDataHora(carga.prazo_entrega)}
                  </div>
                </div>
              </div>
            </div>

            {/* Status do Rastreamento */}
            {carga?.status === 'em_transito' && (
              <div className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                    {permissaoNegada && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">Como habilitar:</p>
                        <ul className="list-disc list-inside mt-1">
                          <li>Chrome: Configurações → Privacidade → Localização</li>
                          <li>Safari: Ajustes → Safari → Localização</li>
                          <li>Firefox: Configurações → Privacidade → Permissões</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!rastreando ? (
                  <button
                    onClick={iniciarRastreamento}
                    className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition shadow-lg flex items-center justify-center gap-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Iniciar Compartilhamento de Localização
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-semibold text-green-800">Rastreamento Ativo</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Sua localização está sendo enviada automaticamente a cada 5 minutos.
                      </p>
                      {ultimaAtualizacao && (
                        <p className="text-xs text-green-600 mt-2">
                          Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={pararRastreamento}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                    >
                      Parar Rastreamento
                    </button>
                  </div>
                )}

                {/* Instruções */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <div className="font-semibold text-blue-900 mb-2">ℹ️ Instruções Importantes</div>
                  <ul className="text-blue-800 space-y-1 list-disc list-inside">
                    <li>Mantenha esta página aberta durante a viagem</li>
                    <li>Certifique-se de ter internet (dados móveis ou Wi-Fi)</li>
                    <li>Sua localização será enviada automaticamente</li>
                    <li>Você pode fechar temporariamente e reabrir depois</li>
                  </ul>
                </div>
              </div>
            )}

            {carga?.status === 'entregue' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <svg className="w-16 h-16 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-xl font-bold text-green-900 mb-2">Carga Entregue!</h3>
                <p className="text-green-700">
                  Esta carga já foi entregue. Obrigado pelo seu trabalho!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white text-sm">
          <p>© 2025 Braticargas - Todos os direitos reservados</p>
          <p className="mt-1 opacity-75">Sistema de Rastreamento de Cargas</p>
        </div>
      </div>
    </div>
  );
}
