// services/fleetEngine.ts - Serviço de integração com Google Fleet Engine

import { Loader } from '@googlemaps/js-api-loader';
import { supabase } from './supabase';
import type { Carga } from '../types';

interface FleetEngineConfig {
  apiKey: string;
  projectId: string;
  providerId: string;
}

interface VehicleLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

class FleetEngineService {
  private config: FleetEngineConfig;
  private loader: Loader;
  private mapsLoaded: boolean = false;
  private trackingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      projectId: import.meta.env.VITE_FLEET_ENGINE_PROJECT_ID || '',
      providerId: import.meta.env.VITE_FLEET_ENGINE_PROVIDER_ID || '',
    };

    this.loader = new Loader({
      apiKey: this.config.apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });
  }

  /**
   * Carrega Google Maps API
   */
  async loadMapsAPI(): Promise<void> {
    if (this.mapsLoaded) return;
    
    try {
      await this.loader.load();
      this.mapsLoaded = true;
      console.log('Google Maps API carregada com sucesso');
    } catch (error) {
      console.error('Erro ao carregar Google Maps API:', error);
      throw error;
    }
  }

  /**
   * Gera ID único para veículo baseado na carga
   */
  private generateVehicleId(cargaId: string): string {
    return `vehicle_${cargaId}`;
  }

  /**
   * Gera ID único para task baseado na carga
   */
  private generateTaskId(cargaId: string): string {
    return `task_${cargaId}`;
  }

  /**
   * Chama Edge Function para intermediar com Fleet Engine
   */
  private async callFleetEngineProxy(action: string, data: any): Promise<any> {
    const { data: result, error } = await supabase.functions.invoke(
      'fleet-engine-proxy',
      {
        body: { action, data },
      }
    );

    if (error) throw error;
    if (!result.success) throw new Error(result.error);

    return result.data;
  }

  /**
   * Inicia rastreamento de uma carga
   * Chamado quando motorista autoriza compartilhamento
   */
  async iniciarRastreamento(
    carga: Carga,
    motoristaNome: string
  ): Promise<{ vehicleId: string; taskId: string }> {
    try {
      const vehicleId = this.generateVehicleId(carga.id);
      const taskId = this.generateTaskId(carga.id);

      // 1. Criar veículo no Fleet Engine
      console.log('Criando veículo no Fleet Engine...');
      await this.callFleetEngineProxy('create_vehicle', {
        vehicleId,
        motoristaNome,
      });

      // 2. Criar task de entrega
      console.log('Criando task de entrega...');
      await this.callFleetEngineProxy('create_task', {
        taskId,
        vehicleId,
        carga,
      });

      // 3. Associar task ao veículo
      console.log('Associando task ao veículo...');
      await this.callFleetEngineProxy('assign_task', {
        taskId,
        vehicleId,
      });

      // 4. Atualizar carga no banco com IDs do Fleet Engine
      await supabase
        .from('cargas')
        .update({
          link_rastreamento: vehicleId, // Reutilizando campo existente
        })
        .eq('id', carga.id);

      console.log('Rastreamento iniciado com sucesso!');

      return { vehicleId, taskId };
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      throw error;
    }
  }

  /**
   * Inicia captura contínua de localização do motorista
   * Roda no dispositivo do motorista
   */
  async iniciarCapturaContinua(cargaId: string): Promise<void> {
    if (!navigator.geolocation) {
      throw new Error('Geolocalização não suportada neste dispositivo');
    }

    const vehicleId = this.generateVehicleId(cargaId);

    // Parar captura anterior se existir
    this.pararCaptura(cargaId);

    // Capturar posição inicial
    await this.capturarEEnviarPosicao(vehicleId, cargaId);

    // Configurar captura contínua a cada 10 segundos
    const interval = setInterval(async () => {
      try {
        await this.capturarEEnviarPosicao(vehicleId, cargaId);
      } catch (error) {
        console.error('Erro ao capturar posição:', error);
      }
    }, 10000); // 10 segundos

    this.trackingIntervals.set(cargaId, interval);

    console.log(`Captura contínua iniciada para carga ${cargaId}`);
  }

  /**
   * Captura posição atual e envia para Fleet Engine
   */
  private async capturarEEnviarPosicao(
    vehicleId: string,
    cargaId: string
  ): Promise<void> {
    const position = await this.obterPosicaoAtual();

    // 1. Atualizar no Fleet Engine
    await this.callFleetEngineProxy('update_location', {
      vehicleId,
      latitude: position.latitude,
      longitude: position.longitude,
      heading: position.heading,
      speed: position.speed,
    });

    // 2. Salvar também no Supabase (backup e histórico)
    await supabase.from('posicoes_gps').insert([
      {
        carga_id: cargaId,
        latitude: position.latitude,
        longitude: position.longitude,
        velocidade: position.speed,
        precisao_metros: position.accuracy,
        origem: 'fleet_engine',
        timestamp: new Date().toISOString(),
      },
    ]);

    console.log('Posição atualizada:', position);
  }

  /**
   * Obtém posição atual do GPS
   */
  private obterPosicaoAtual(): Promise<VehicleLocation & { accuracy: number }> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Para captura de localização
   */
  pararCaptura(cargaId: string): void {
    const interval = this.trackingIntervals.get(cargaId);
    if (interval) {
      clearInterval(interval);
      this.trackingIntervals.delete(cargaId);
      console.log(`Captura parada para carga ${cargaId}`);
    }
  }

  /**
   * Para todas as capturas
   */
  pararTodasCapturas(): void {
    this.trackingIntervals.forEach((interval) => clearInterval(interval));
    this.trackingIntervals.clear();
    console.log('Todas as capturas foram paradas');
  }

  /**
   * Gera token JWT para cliente visualizar o mapa
   * Este token é usado no frontend para autenticar com Fleet Engine
   */
  async gerarTokenVisualizacao(cargaId: string): Promise<string> {
    const vehicleId = this.generateVehicleId(cargaId);

    const result = await this.callFleetEngineProxy('generate_token', {
      vehicleId,
    });

    return result.token;
  }

  /**
   * Calcula ETA (Estimated Time of Arrival) usando Directions API
   */
  async calcularETA(
    origem: { lat: number; lng: number },
    destino: { lat: number; lng: number }
  ): Promise<{
    distancia: number;
    duracao: number;
    duracaoComTrafego: number;
  }> {
    try {
      await this.loadMapsAPI();

      const directionsService = new google.maps.DirectionsService();

      const result = await directionsService.route({
        origin: new google.maps.LatLng(origem.lat, origem.lng),
        destination: new google.maps.LatLng(destino.lat, destino.lng),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      });

      if (result.routes.length === 0) {
        throw new Error('Nenhuma rota encontrada');
      }

      const route = result.routes[0];
      const leg = route.legs[0];

      return {
        distancia: leg.distance?.value || 0, // em metros
        duracao: leg.duration?.value || 0, // em segundos
        duracaoComTrafego: leg.duration_in_traffic?.value || leg.duration?.value || 0,
      };
    } catch (error) {
      console.error('Erro ao calcular ETA:', error);
      throw error;
    }
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
        .eq('origem', 'fleet_engine')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return false;

      // Verificar se última atualização foi há menos de 30 segundos
      const ultimaAtualizacao = new Date(data.timestamp);
      const agora = new Date();
      const diferencaSegundos = (agora.getTime() - ultimaAtualizacao.getTime()) / 1000;

      return diferencaSegundos < 30;
    } catch (error) {
      console.error('Erro ao verificar compartilhamento:', error);
      return false;
    }
  }

  /**
   * Finaliza entrega e atualiza status no Fleet Engine
   */
  async finalizarEntrega(cargaId: string): Promise<void> {
    try {
      const taskId = this.generateTaskId(cargaId);

      // Atualizar task para CLOSED
      await this.callFleetEngineProxy('update_task_status', {
        taskId,
        status: 'CLOSED',
        outcome: 'SUCCEEDED',
      });

      // Parar captura de localização
      this.pararCaptura(cargaId);

      console.log('Entrega finalizada com sucesso');
    } catch (error) {
      console.error('Erro ao finalizar entrega:', error);
      throw error;
    }
  }
}

// Exportar instância única
export const fleetEngineService = new FleetEngineService();
export default fleetEngineService;
