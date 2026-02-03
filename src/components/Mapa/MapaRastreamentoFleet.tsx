// components/Mapa/MapaRastreamentoFleet.tsx
// Componente de mapa com Google Maps e Fleet Engine

import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { fleetEngineService } from '../../services/fleetEngine';
import type { Carga } from '../../types';
import { Clock, Navigation, MapPin } from 'lucide-react';

interface MapaRastreamentoFleetProps {
  carga: Carga;
  mostrarRota?: boolean;
  altura?: string;
}

export function MapaRastreamentoFleet({
  carga,
  mostrarRota = true,
  altura = '500px',
}: MapaRastreamentoFleetProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [vehicleMarker, setVehicleMarker] = useState<google.maps.Marker | null>(null);
  const [routePolyline, setRoutePolyline] = useState<google.maps.Polyline | null>(null);
  const [eta, setEta] = useState<{
    distancia: number;
    duracao: number;
    duracaoComTrafego: number;
  } | null>(null);
  const [compartilhamentoAtivo, setCompartilhamentoAtivo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initMap();
    verificarCompartilhamento();

    // Atualizar ETA a cada 30 segundos
    const etaInterval = setInterval(() => {
      if (compartilhamentoAtivo) {
        atualizarETA();
      }
    }, 30000);

    // Verificar compartilhamento a cada 10 segundos
    const checkInterval = setInterval(() => {
      verificarCompartilhamento();
    }, 10000);

    return () => {
      clearInterval(etaInterval);
      clearInterval(checkInterval);
    };
  }, [carga.id]);

  useEffect(() => {
    if (map && compartilhamentoAtivo) {
      iniciarRastreamentoNoMapa();
    }
  }, [map, compartilhamentoAtivo]);

  async function initMap() {
    if (!mapRef.current) return;

    try {
      await fleetEngineService.loadMapsAPI();

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: {
          lat: carga.origem_lat || -15.7801,
          lng: carga.origem_lng || -47.9292,
        },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMap(mapInstance);

      // Adicionar marcadores de origem e destino
      new google.maps.Marker({
        position: {
          lat: carga.origem_lat || 0,
          lng: carga.origem_lng || 0,
        },
        map: mapInstance,
        title: 'Origem',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });

      new google.maps.Marker({
        position: {
          lat: carga.destino_lat || 0,
          lng: carga.destino_lng || 0,
        },
        map: mapInstance,
        title: 'Destino',
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
      });

      setLoading(false);
    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      setLoading(false);
    }
  }

  async function verificarCompartilhamento() {
    const ativo = await fleetEngineService.verificarCompartilhamentoAtivo(carga.id);
    setCompartilhamentoAtivo(ativo);
  }

  async function iniciarRastreamentoNoMapa() {
    if (!map) return;

    try {
      // Buscar posição mais recente
      const { data: posicoes } = await supabase
        .from('posicoes_gps')
        .select('*')
        .eq('carga_id', carga.id)
        .eq('origem', 'fleet_engine')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!posicoes || posicoes.length === 0) return;

      const posicao = posicoes[0];

      // Criar ou atualizar marcador do veículo
      if (!vehicleMarker) {
        const marker = new google.maps.Marker({
          position: {
            lat: posicao.latitude,
            lng: posicao.longitude,
          },
          map,
          title: 'Veículo',
          icon: {
            url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            scaledSize: new google.maps.Size(40, 40),
          },
        });
        setVehicleMarker(marker);
      } else {
        vehicleMarker.setPosition({
          lat: posicao.latitude,
          lng: posicao.longitude,
        });
      }

      // Desenhar rota se solicitado
      if (mostrarRota) {
        await desenharRota(posicao.latitude, posicao.longitude);
      }

      // Centralizar mapa no veículo
      map.setCenter({
        lat: posicao.latitude,
        lng: posicao.longitude,
      });

      // Atualizar ETA
      await atualizarETA();
    } catch (error) {
      console.error('Erro ao iniciar rastreamento no mapa:', error);
    }
  }

  async function desenharRota(latAtual: number, lngAtual: number) {
    if (!map) return;

    try {
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#2563eb',
          strokeWeight: 4,
        },
      });

      const result = await directionsService.route({
        origin: new google.maps.LatLng(latAtual, lngAtual),
        destination: new google.maps.LatLng(
          carga.destino_lat || 0,
          carga.destino_lng || 0
        ),
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      });

      directionsRenderer.setDirections(result);
    } catch (error) {
      console.error('Erro ao desenhar rota:', error);
    }
  }

  async function atualizarETA() {
    try {
      // Buscar posição mais recente
      const { data: posicoes } = await supabase
        .from('posicoes_gps')
        .select('*')
        .eq('carga_id', carga.id)
        .eq('origem', 'fleet_engine')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (!posicoes || posicoes.length === 0) return;

      const posicao = posicoes[0];

      const etaData = await fleetEngineService.calcularETA(
        { lat: posicao.latitude, lng: posicao.longitude },
        { lat: carga.destino_lat || 0, lng: carga.destino_lng || 0 }
      );

      setEta(etaData);
    } catch (error) {
      console.error('Erro ao atualizar ETA:', error);
    }
  }

  function formatarDistancia(metros: number): string {
    if (metros < 1000) {
      return `${metros.toFixed(0)} m`;
    }
    return `${(metros / 1000).toFixed(1)} km`;
  }

  function formatarTempo(segundos: number): string {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos} min`;
  }

  return (
    <div className="relative">
      {/* Mapa */}
      <div
        ref={mapRef}
        style={{ height: altura }}
        className="w-full rounded-lg shadow-lg"
      />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 rounded-lg">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p>Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Status de compartilhamento */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              compartilhamentoAtivo ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium">
            {compartilhamentoAtivo
              ? 'Rastreamento ativo'
              : 'Aguardando compartilhamento'}
          </span>
        </div>
      </div>

      {/* Informações de ETA */}
      {compartilhamentoAtivo && eta && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Distância restante</p>
              <p className="text-lg font-bold">{formatarDistancia(eta.distancia)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Tempo estimado</p>
              <p className="text-lg font-bold">
                {formatarTempo(eta.duracaoComTrafego)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Destino</p>
              <p className="text-sm font-medium">
                {carga.destino_cidade}, {carga.destino_uf}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
