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
 */

interface ConfigAPI {
  baseUrl: string;
  apiKey: string;
  intervaloAtualizacao: number; // em minutos
}

class RastreamentoService {
  private config: ConfigAPI;
  private intervalos: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_RASTREAMENTO_API_URL || '',
      apiKey: import.meta.env.VITE_RASTREAMENTO_API_KEY || '',
      intervaloAtualizacao: 5 // 5 minutos padrão
    };
  }

  /**
   * Gera link único para motorista compartilhar localização
   * Este link pode ser via WhatsApp ou SMS
   */
  async gerarLinkRastreamento(cargaId: string, telefoneMotorista: string): Promise<string> {
    try {
      // Gerar token único
      const token = this.gerarToken();
      
      // URL base para compartilhamento
      const baseUrl = `${window.location.origin}/rastreamento`;
      const linkRastreamento = `${baseUrl}/${token}`;

      // Salvar token no banco relacionado à carga
      const { error } = await supabase
        .from('cargas')
        .update({ 
          link_rastreamento: token 
        })
        .eq('id', cargaId);

      if (error) throw error;

      // Enviar link por WhatsApp (simulado - você precisará integrar com API de WhatsApp)
      await this.enviarLinkWhatsApp(telefoneMotorista, linkRastreamento);

      return linkRastreamento;
    } catch (error) {
      console.error('Erro ao gerar link de rastreamento:', error);
      throw error;
    }
  }

  /**
   * Captura localização do motorista via navegador
   * Esta função roda no lado do motorista quando ele abre o link
   */
  async capturarLocalizacaoMotorista(token: string): Promise<void> {
    if (!navigator.geolocation) {
      throw new Error('Geolocalização não suportada neste dispositivo');
    }

    // Buscar carga pelo token
    const { data: carga, error } = await supabase
      .from('cargas')
      .select('id')
      .eq('link_rastreamento', token)
      .single();

    if (error || !carga) {
      throw new Error('Token de rastreamento inválido');
    }

    // Iniciar rastreamento contínuo
    this.iniciarRastreamentoContinuo(carga.id, token);
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
  private async capturarPosicao(cargaId: string): Promise<void> {
    try {
      const posicao = await this.obterPosicaoAtual();

      // Salvar no banco
      const { error } = await supabase
        .from('posicoes_gps')
        .insert([
          {
            carga_id: cargaId,
            latitude: posicao.latitude,
            longitude: posicao.longitude,
            velocidade: posicao.velocidade,
            precisao_metros: posicao.precisao,
            origem: 'api_rastreamento',
            timestamp: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      console.log('Posição salva com sucesso:', posicao);
    } catch (error) {
      console.error('Erro ao capturar posição:', error);
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
      const mensagem = `Olá! 👋
      
Para que possamos rastrear sua carga em tempo real, por favor clique no link abaixo e permita o acesso à sua localização:

${link}

Este link é seguro e será usado apenas para acompanhar a entrega da carga.

Obrigado!
Braticargas`;

      // OPÇÃO 1: Via WhatsApp Web (abre no navegador)
      const telefoneFormatado = telefone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/55${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
      
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
        .single();

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
