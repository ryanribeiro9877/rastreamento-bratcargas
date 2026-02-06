// utils/calculos.ts - Funções de cálculo para rastreamento

import type { Carga, PosicaoGPS, StatusPrazo } from '../types';

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lng1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lng2 Longitude do ponto 2
 * @returns Distância em quilômetros
 */
export function calcularDistancia(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distancia = R * c;
  
  return Math.round(distancia * 100) / 100; // Arredonda para 2 casas decimais
}

function toRad(valor: number): number {
  return valor * Math.PI / 180;
}

/**
 * Calcula o status de prazo da carga baseado na posição atual
 */
export function calcularStatusPrazo(
  carga: Carga,
  ultimaPosicao?: PosicaoGPS
): StatusPrazo {
  if (carga.status === 'entregue') {
    // Se já foi entregue, verificar se foi no prazo
    const dataEntrega = new Date(carga.data_entrega_real!);
    const prazoEntrega = new Date(carga.prazo_entrega);
    
    if (dataEntrega <= prazoEntrega) {
      // Verificar se foi adiantada (mais de 2 horas antes)
      const diferencaHoras = (prazoEntrega.getTime() - dataEntrega.getTime()) / (1000 * 60 * 60);
      return diferencaHoras >= 2 ? 'adiantado' : 'no_prazo';
    }
    return 'atrasado';
  }
  
  if (!ultimaPosicao) {
    return 'no_prazo'; // Sem dados de posição ainda
  }
  
  // Calcular distância restante (motorista → destino)
  const distanciaRestante = (carga.destino_lat && carga.destino_lng)
    ? calcularDistancia(
        ultimaPosicao.latitude,
        ultimaPosicao.longitude,
        carga.destino_lat,
        carga.destino_lng
      )
    : 0;

  // Distância total da rota
  const distanciaOrigemDestino = (carga.origem_lat && carga.origem_lng && carga.destino_lat && carga.destino_lng)
    ? calcularDistancia(carga.origem_lat, carga.origem_lng, carga.destino_lat, carga.destino_lng)
    : 0;
  const distTotal = (carga.distancia_total_km && carga.distancia_total_km > 0)
    ? carga.distancia_total_km
    : distanciaOrigemDestino;

  // Percentual baseado na distância restante: progresso = 1 - (restante / total)
  let percentualPercorrido = 0;
  if (distTotal > 0) {
    percentualPercorrido = Math.max(0, ((distTotal - distanciaRestante) / distTotal) * 100);
  }
  
  // Calcular tempo decorrido e total
  const agora = new Date();
  const dataCarregamento = new Date(carga.data_carregamento);
  const prazoEntrega = new Date(carga.prazo_entrega);
  
  const tempoDecorrido = agora.getTime() - dataCarregamento.getTime();
  const tempoTotal = prazoEntrega.getTime() - dataCarregamento.getTime();
  const percentualTempo = (tempoDecorrido / tempoTotal) * 100;
  
  // Lógica do semáforo
  // ADIANTADO (AZUL): Percorreu mais que 10% além do esperado
  if (percentualPercorrido >= (percentualTempo + 10)) {
    return 'adiantado';
  }
  
  // ATRASADO (VERMELHO): Percorreu menos que 10% do esperado
  if (percentualPercorrido < (percentualTempo - 10)) {
    return 'atrasado';
  }
  
  // NO PRAZO (VERDE): Dentro da margem de 10%
  return 'no_prazo';
}

/**
 * Estima o tempo restante para entrega baseado na velocidade média
 */
export function estimarTempoRestante(
  distanciaRestanteKm: number,
  velocidadeMediaKmH: number
): { horas: number; minutos: number } {
  const horasRestantes = distanciaRestanteKm / velocidadeMediaKmH;
  const horas = Math.floor(horasRestantes);
  const minutos = Math.round((horasRestantes - horas) * 60);
  
  return { horas, minutos };
}

/**
 * Calcula a velocidade média das últimas N posições
 */
export function calcularVelocidadeMedia(posicoes: PosicaoGPS[]): number {
  if (posicoes.length < 2) return 0;
  
  let velocidadeTotal = 0;
  let contador = 0;
  
  for (let i = 1; i < posicoes.length; i++) {
    const posicaoAtual = posicoes[i];
    const posicaoAnterior = posicoes[i - 1];
    
    const distancia = calcularDistancia(
      posicaoAnterior.latitude,
      posicaoAnterior.longitude,
      posicaoAtual.latitude,
      posicaoAtual.longitude
    );
    
    const tempoDecorrido = 
      (new Date(posicaoAtual.timestamp).getTime() - 
       new Date(posicaoAnterior.timestamp).getTime()) / (1000 * 60 * 60); // em horas
    
    if (tempoDecorrido > 0) {
      velocidadeTotal += distancia / tempoDecorrido;
      contador++;
    }
  }
  
  return contador > 0 ? Math.round(velocidadeTotal / contador) : 0;
}

/**
 * Calcula a distância total da rota origem -> destino
 * Futuramente pode ser integrado com API de rotas (Google Maps, OpenRoute, etc)
 */
export function calcularDistanciaTotal(
  origemLat: number,
  origemLng: number,
  destinoLat: number,
  destinoLng: number
): number {
  // Por enquanto, distância em linha reta
  // TODO: Integrar com API de rotas para distância real
  return calcularDistancia(origemLat, origemLng, destinoLat, destinoLng);
}

/**
 * Verifica se a carga está próxima do destino (dentro de 5km)
 */
export function estaProximoDestino(
  posicaoAtual: PosicaoGPS,
  destinoLat: number,
  destinoLng: number
): boolean {
  const distancia = calcularDistancia(
    posicaoAtual.latitude,
    posicaoAtual.longitude,
    destinoLat,
    destinoLng
  );
  
  return distancia <= 5; // 5km de raio
}

/**
 * Calcula o percentual de conclusão da entrega
 */
export interface ProgressoEntrega {
  percentualPercorrido: number;
  percentualTempo: number;
  distanciaPercorrida: number;
  distanciaRestante: number;
  tempoDecorrido: string;
  tempoRestante: string;
  status: StatusPrazo;
}

export function calcularProgressoEntrega(
  carga: Carga,
  ultimaPosicao?: PosicaoGPS
): ProgressoEntrega {
  const agora = new Date();
  const dataCarregamento = new Date(carga.data_carregamento);
  const prazoEntrega = new Date(carga.prazo_entrega);
  const tempoDecorridoMs = Math.max(0, agora.getTime() - dataCarregamento.getTime());
  const tempoTotalMs = Math.max(1, prazoEntrega.getTime() - dataCarregamento.getTime());
  const tempoRestanteMs = Math.max(0, prazoEntrega.getTime() - agora.getTime());
  const percentualTempo = Math.min(100, Math.round((tempoDecorridoMs / tempoTotalMs) * 100));

  // Sem posição GPS → progresso 0%
  if (!ultimaPosicao) {
    return {
      percentualPercorrido: 0,
      percentualTempo,
      distanciaPercorrida: 0,
      distanciaRestante: carga.distancia_total_km || 0,
      tempoDecorrido: formatarDuracao(tempoDecorridoMs),
      tempoRestante: formatarDuracao(tempoRestanteMs),
      status: 'no_prazo'
    };
  }

  // Calcular distância restante (motorista → destino)
  const distanciaRestante = (carga.destino_lat && carga.destino_lng)
    ? calcularDistancia(
        ultimaPosicao.latitude,
        ultimaPosicao.longitude,
        carga.destino_lat,
        carga.destino_lng
      )
    : 0;

  // Distância total da rota (origem → destino)
  const distanciaOrigemDestino = (carga.origem_lat && carga.origem_lng && carga.destino_lat && carga.destino_lng)
    ? calcularDistancia(carga.origem_lat, carga.origem_lng, carga.destino_lat, carga.destino_lng)
    : 0;

  // Usar distancia_total_km do banco se disponível, senão calcular em linha reta
  const distTotal = (carga.distancia_total_km && carga.distancia_total_km > 0)
    ? carga.distancia_total_km
    : distanciaOrigemDestino;

  // Distância percorrida = total - restante
  const distanciaPercorrida = Math.max(0, distTotal - distanciaRestante);

  // Calcular percentual baseado na distância restante
  // progresso = 1 - (restante / total) — mais preciso que percorrida/total
  let percentualPercorrido = 0;
  if (distTotal > 0) {
    percentualPercorrido = ((distTotal - distanciaRestante) / distTotal) * 100;
  }

  // Clamp entre 0 e 100
  percentualPercorrido = Math.min(100, Math.max(0, Math.round(percentualPercorrido)));

  return {
    percentualPercorrido,
    percentualTempo,
    distanciaPercorrida: Math.round(distanciaPercorrida),
    distanciaRestante: Math.round(distanciaRestante),
    tempoDecorrido: formatarDuracao(tempoDecorridoMs),
    tempoRestante: formatarDuracao(tempoRestanteMs),
    status: calcularStatusPrazo(carga, ultimaPosicao)
  };
}

function formatarDuracao(ms: number): string {
  const horas = Math.floor(ms / (1000 * 60 * 60));
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas}h ${minutos}min`;
}

function formatarTempo(dataString: string): string {
  const data = new Date(dataString);
  const agora = new Date();
  const diff = data.getTime() - agora.getTime();
  return formatarDuracao(Math.max(0, diff));
}
