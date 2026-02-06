// services/rastreamento.ts - Integração com API de Rastreamento GPS

import { supabase } from './supabase';
import type { PosicaoGPS } from '../types';

/**
 * Serviço de integração com API de rastreamento GPS
 * Este arquivo deve ser adaptado de acordo com a API específica que você usar
 * 
 * Exemplos de APIs compatíveis:
 * - GPS Gate
 * - Traccar
 * - Wialon
 * - Custom API
 * - Google Fleet Engine (opcional)
 */

interface ConfigAPI {
  baseUrl: string;
  apiKey: string;
  intervaloAtualizacao: number; // em minutos
  usarFleetEngine: boolean; // Ativar/desativar Fleet Engine
}

class RastreamentoService {
  private config: ConfigAPI;
  private intervalos: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_RASTREAMENTO_API_URL || '',
      apiKey: import.meta.env.VITE_RASTREAMENTO_API_KEY || '',
      intervaloAtualizacao: 5, // 5 minutos padrão
      usarFleetEngine: false
    };
  }

  /**
   * Gera link único para motorista compartilhar localização
   * Este link pode ser via WhatsApp ou SMS
   */
  async gerarLinkRastreamento(cargaId: string, telefoneMotorista: string, accessToken?: string): Promise<string> {
    // Gerar token único
    const token = this.gerarToken();
    
    // URL base para compartilhamento
    const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
    const origin = publicAppUrl && /^https?:\/\//i.test(publicAppUrl)
      ? publicAppUrl.replace(/\/+$/, '')
      : window.location.origin;

    const baseUrl = `${origin}/rastreamento`;
    const linkRastreamento = `${baseUrl}/${token}`;

    // Salvar token no banco via fetch direto (aguardar para garantir que o link exista quando o motorista abrir)
    try {
      let tkn = accessToken;
      if (!tkn) {
        const session = (await supabase.auth.getSession()).data.session;
        tkn = session?.access_token;
      }
      if (tkn) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        const patchRes = await fetch(`${supabaseUrl}/rest/v1/cargas?id=eq.${cargaId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${tkn}`
          },
          body: JSON.stringify({ link_rastreamento: token })
        });
        console.log('[RASTREAMENTO] PATCH link_rastreamento status:', patchRes.status);
      }
    } catch (err) {
      console.error('Erro ao salvar link_rastreamento:', err);
    }

    return linkRastreamento;
  }

  gerarMensagemCompartilhamento(linkRastreamento: string, motoristaNome?: string): string {
    const saudacao = motoristaNome ? `Olá, ${motoristaNome}!` : 'Olá!';
    return `${saudacao}

Para que possamos rastrear sua carga em tempo real, por favor clique no link abaixo e permita o acesso à sua localização:

${linkRastreamento}

Este link é seguro e será usado apenas para acompanhar a entrega da carga.

Obrigado!
BratCargas`;
  }

  gerarUrlWhatsApp(telefone: string, mensagem: string): string {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    return `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
  }

  gerarUrlSms(telefone: string, mensagem: string): string {
    const telefoneFormatado = telefone.replace(/\D/g, '');
    return `sms:+55${telefoneFormatado}?body=${encodeURIComponent(mensagem)}`;
  }

  /**
   * Captura localização do motorista via navegador
   * Esta função roda no lado do motorista quando ele abre o link
   */
  async capturarLocalizacaoMotorista(token: string): Promise<string> {
    if (!navigator.geolocation) {
      throw new Error('Geolocalização não suportada neste dispositivo');
    }

    // Buscar carga pelo token via REST (página pública, sem auth do usuário)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/cargas?link_rastreamento=eq.${token}&select=id&limit=1`,
      { headers: { 'apikey': supabaseKey } }
    );

    if (!response.ok) throw new Error('Erro ao buscar carga');
    const rows = await response.json();
    if (!rows?.length) throw new Error('Token de rastreamento inválido');

    const cargaId = rows[0].id;

    // Iniciar rastreamento contínuo
    this.iniciarRastreamentoContinuo(cargaId, token);
    return cargaId;
  }

  /**
   * Inicia rastreamento contínuo da posição
   */
  private iniciarRastreamentoContinuo(cargaId: string, token: string): void {
    // Cancelar rastreamento anterior se existir
    this.pararRastreamento(cargaId);

    // Capturar posição inicial
    this.capturarPosicao(cargaId);

    // Configurar intervalo de captura
    const intervalo = setInterval(() => {
      this.capturarPosicao(cargaId);
    }, this.config.intervaloAtualizacao * 60 * 1000);

    this.intervalos.set(cargaId, intervalo);
  }

  /**
   * Captura posição atual e salva no banco
   */
  private async capturarPosicao(cargaId: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const posicao = await this.obterPosicaoAtual();

      // Salvar no banco via REST (página pública)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      fetch(`${supabaseUrl}/rest/v1/posicoes_gps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          carga_id: cargaId,
          latitude: posicao.latitude,
          longitude: posicao.longitude,
          velocidade: posicao.velocidade,
          precisao_metros: posicao.precisao,
          origem: 'api_rastreamento',
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Erro ao salvar posição:', err));

      console.log('Posição capturada:', posicao.latitude, posicao.longitude);
      return { latitude: posicao.latitude, longitude: posicao.longitude };
    } catch (error) {
      console.error('Erro ao capturar posição:', error);
      return null;
    }
  }

  /**
   * Obtém posição atual do GPS
   */
  private obterPosicaoAtual(): Promise<{
    latitude: number;
    longitude: number;
    velocidade: number | null;
    precisao: number;
  }> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            velocidade: position.coords.speed,
            precisao: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Para rastreamento de uma carga específica
   */
  pararRastreamento(cargaId: string): void {
    const intervalo = this.intervalos.get(cargaId);
    if (intervalo) {
      clearInterval(intervalo);
      this.intervalos.delete(cargaId);
    }
  }

  /**
   * Para todos os rastreamentos
   */
  pararTodosRastreamentos(): void {
    this.intervalos.forEach((intervalo) => clearInterval(intervalo));
    this.intervalos.clear();
  }

  /**
   * Busca histórico de posições de uma API externa
   * (Exemplo para integração com Traccar ou similar)
   */
  async buscarHistoricoAPI(deviceId: string, dataInicio: Date, dataFim: Date): Promise<PosicaoGPS[]> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/positions?deviceId=${deviceId}&from=${dataInicio.toISOString()}&to=${dataFim.toISOString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico da API');
      }

      const data = await response.json();
      
      // Converter formato da API para nosso formato
      return data.map((pos: any) => ({
        latitude: pos.latitude,
        longitude: pos.longitude,
        velocidade: pos.speed,
        timestamp: pos.deviceTime,
        precisao_metros: pos.accuracy,
        origem: 'api_rastreamento'
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico da API:', error);
      throw error;
    }
  }

  /**
   * Envia link de rastreamento via WhatsApp
   * Você precisará integrar com uma API de WhatsApp (ex: Twilio, WhatsApp Business API)
   */
  private async enviarLinkWhatsApp(telefone: string, link: string): Promise<void> {
    try {
      // Formatar mensagem
      const mensagem = this.gerarMensagemCompartilhamento(link);

      // OPÇÃO 1: Via WhatsApp Web (abre no navegador)
      const whatsappUrl = this.gerarUrlWhatsApp(telefone, mensagem);
      
      console.log('Link WhatsApp gerado:', whatsappUrl);
      
      // OPÇÃO 2: Via API (Twilio, WhatsApp Business, etc)
      // const response = await fetch('https://api.twilio.com/...', {
      //   method: 'POST',
      //   headers: { ... },
      //   body: JSON.stringify({ ... })
      // });

      return;
    } catch (error) {
      console.error('Erro ao enviar link por WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Gera token único para rastreamento
   */
  private gerarToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Verifica se motorista está compartilhando localização
   */
  async verificarCompartilhamentoAtivo(cargaId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('posicoes_gps')
        .select('timestamp')
        .eq('carga_id', cargaId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single<{ timestamp: string }>();

      if (error || !data) return false;

      // Verificar se última atualização foi há menos de 10 minutos
      const ultimaAtualizacao = new Date(data.timestamp);
      const agora = new Date();
      const diferencaMinutos = (agora.getTime() - ultimaAtualizacao.getTime()) / (1000 * 60);

      return diferencaMinutos < 10;
    } catch (error) {
      console.error('Erro ao verificar compartilhamento:', error);
      return false;
    }
  }
}

// Exportar instância única
export const rastreamentoService = new RastreamentoService();
export default rastreamentoService;
