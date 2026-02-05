// pages/AutorizacaoMotorista.tsx
// Tela para motorista autorizar compartilhamento de localização

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { fleetEngineService } from '../services/fleetEngine';
import type { Carga } from '../types';
import { MapPin, Truck, CheckCircle, AlertCircle, Navigation } from 'lucide-react';

export function AutorizacaoMotorista() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [loading, setLoading] = useState(true);
  const [autorizando, setAutorizando] = useState(false);
  const [autorizado, setAutorizado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [motoristaNome, setMotoristaNome] = useState('');

  useEffect(() => {
    carregarCarga();
  }, [token]);

  async function carregarCarga() {
    try {
      setLoading(true);
      setErro(null);

      if (!token) {
        throw new Error('Token inválido');
      }

      // Buscar carga pelo token
      const { data, error } = await supabase
        .from('cargas')
        .select(`
          *,
          embarcador:embarcadores(*)
        `)
        .eq('link_rastreamento', token)
        .single();

      if (error || !data) {
        throw new Error('Carga não encontrada ou token inválido');
      }

      setCarga(data);

      // Verificar se já está compartilhando
      const compartilhando = await fleetEngineService.verificarCompartilhamentoAtivo(
        data.id
      );
      setAutorizado(compartilhando);

      // Se já está compartilhando, iniciar captura
      if (compartilhando) {
        await fleetEngineService.iniciarCapturaContinua(data.id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar carga:', error);
      setErro(error.message || 'Erro ao carregar informações da carga');
    } finally {
      setLoading(false);
    }
  }

  async function autorizarCompartilhamento() {
    if (!carga || !motoristaNome.trim()) {
      setErro('Por favor, informe seu nome');
      return;
    }

    try {
      setAutorizando(true);
      setErro(null);

      // Verificar permissão de geolocalização
      if (!navigator.geolocation) {
        throw new Error('Seu dispositivo não suporta geolocalização');
      }

      // Solicitar permissão
      const permissao = await navigator.permissions.query({ name: 'geolocation' });
      if (permissao.state === 'denied') {
        throw new Error(
          'Permissão de localização negada. Por favor, habilite nas configurações do navegador.'
        );
      }

      // Iniciar rastreamento no Fleet Engine
      await fleetEngineService.iniciarRastreamento(carga, motoristaNome);

      // Atualizar nome do motorista na carga
      await supabase
        .from('cargas')
        .update({ motorista_nome: motoristaNome })
        .eq('id', carga.id);

      // Iniciar captura contínua
      await fleetEngineService.iniciarCapturaContinua(carga.id);

      setAutorizado(true);
    } catch (error: any) {
      console.error('Erro ao autorizar:', error);
      setErro(error.message || 'Erro ao autorizar compartilhamento');
    } finally {
      setAutorizando(false);
    }
  }

  async function pararCompartilhamento() {
    if (!carga) return;

    try {
      fleetEngineService.pararCaptura(carga.id);
      setAutorizado(false);
      alert('Compartilhamento de localização parado com sucesso');
    } catch (error: any) {
      console.error('Erro ao parar compartilhamento:', error);
      alert('Erro ao parar compartilhamento');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando informações...</p>
        </div>
      </div>
    );
  }

  if (erro && !carga) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-6">{erro}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  if (!carga) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BratCargas
          </h1>
          <p className="text-gray-600">Sistema de Rastreamento de Cargas</p>
        </div>

        {/* Informações da Carga */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Nota Fiscal</p>
            <p className="font-semibold text-gray-900">{carga.nota_fiscal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Embarcador</p>
            <p className="font-semibold text-gray-900">
              {carga.embarcador?.razao_social || 'N/A'}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Origem → Destino</p>
              <p className="text-sm font-medium text-gray-900">
                {carga.origem_cidade}, {carga.origem_uf} → {carga.destino_cidade},{' '}
                {carga.destino_uf}
              </p>
            </div>
          </div>
        </div>

        {/* Status Atual */}
        {autorizado ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-900">Rastreamento Ativo</h3>
                <p className="text-sm text-green-700">
                  Sua localização está sendo compartilhada
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-green-700 mb-4">
              <Navigation className="w-4 h-4 animate-pulse" />
              <span>Atualizando a cada 10 segundos</span>
            </div>

            <button
              onClick={pararCompartilhamento}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Parar Compartilhamento
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Formulário de Autorização */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu Nome
              </label>
              <input
                type="text"
                value={motoristaNome}
                onChange={(e) => setMotoristaNome(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={autorizando}
              />
            </div>

            {/* Informações de Privacidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2 text-sm">
                🔒 Sua privacidade é importante
              </h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Sua localização será compartilhada apenas durante a entrega</li>
                <li>• Os dados são criptografados e seguros</li>
                <li>• Você pode parar o compartilhamento a qualquer momento</li>
                <li>• Apenas o embarcador terá acesso à sua localização</li>
              </ul>
            </div>

            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{erro}</p>
              </div>
            )}

            {/* Botão de Autorização */}
            <button
              onClick={autorizarCompartilhamento}
              disabled={autorizando || !motoristaNome.trim()}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {autorizando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Autorizando...
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  Autorizar Compartilhamento
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Ao autorizar, você concorda com o compartilhamento temporário da sua
            localização para fins de rastreamento da carga.
          </p>
        </div>
      </div>
    </div>
  );
}
