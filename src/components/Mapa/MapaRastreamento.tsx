// components/Mapa/MapaRastreamento.tsx - Mapa de Rastreamento com Auto-Refresh

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Carga } from '../../types';
import { useAutoRefresh } from '../../hooks/useRealtime';
import { getMapboxRoute } from '../../services/mapboxDirections';

interface MapaRastreamentoProps {
  cargas: Carga[];
  center?: [number, number];
  zoom?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // em milissegundos
  onCargaClick?: (carga: Carga) => void;
}

export default function MapaRastreamento({
  cargas,
  center = [-15.7942, -47.8822], // Centro do Brasil
  zoom = 4,
  autoRefresh = true,
  refreshInterval = 30000, // 30 segundos
  onCargaClick
}: MapaRastreamentoProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const routeRef = useRef<L.Polyline | null>(null);
  const routeRequestIdRef = useRef(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [cargaSelecionadaId, setCargaSelecionadaId] = useState<string | null>(null);

  // Configurar auto-refresh
  useAutoRefresh(() => {
    setLastUpdate(new Date());
  }, autoRefresh ? refreshInterval : 0);

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map('mapa-rastreamento').setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!cargaSelecionadaId) {
      if (routeRef.current) {
        routeRef.current.remove();
        routeRef.current = null;
      }
      return;
    }

    const cargaSelecionada = cargas.find((c) => c.id === cargaSelecionadaId);
    if (!cargaSelecionada) return;

    const origem = cargaSelecionada.ultima_posicao
      ? { lat: cargaSelecionada.ultima_posicao.latitude, lng: cargaSelecionada.ultima_posicao.longitude }
      : { lat: cargaSelecionada.origem_lat, lng: cargaSelecionada.origem_lng };

    const destino = { lat: cargaSelecionada.destino_lat, lng: cargaSelecionada.destino_lng };

    if (!Number.isFinite(origem.lat) || !Number.isFinite(origem.lng) || !Number.isFinite(destino.lat) || !Number.isFinite(destino.lng)) {
      return;
    }

    const requestId = ++routeRequestIdRef.current;

    getMapboxRoute({ from: origem, to: destino, profile: 'driving' })
      .then((route) => {
        if (requestId !== routeRequestIdRef.current) return;

        if (!mapRef.current) return;

        if (routeRef.current) {
          routeRef.current.remove();
          routeRef.current = null;
        }

        routeRef.current = L.polyline(route.coordinatesLatLng, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.9
        }).addTo(mapRef.current);

        mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [50, 50] });
      })
      .catch((error) => {
        console.error('Erro ao calcular rota Mapbox:', error);
      });
  }, [cargaSelecionadaId, cargas, lastUpdate]);

  // Atualizar marcadores quando cargas mudarem
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remover marcadores antigos
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    // Adicionar novos marcadores
    cargas.forEach(carga => {
      const posicao = carga.ultima_posicao;
      
      if (!posicao) {
        // Se não tem posição, mostrar na origem
        adicionarMarcador(map, carga, carga.origem_lat, carga.origem_lng, true);
        return;
      }

      // Mostrar na última posição conhecida
      adicionarMarcador(map, carga, posicao.latitude, posicao.longitude, false);
    });

    // Ajustar zoom para mostrar todos os marcadores
    if (!cargaSelecionadaId && cargas.length > 0) {
      const bounds = L.latLngBounds(
        cargas
          .filter(c => c.ultima_posicao || (c.origem_lat && c.origem_lng))
          .map(c => {
            if (c.ultima_posicao) {
              return [c.ultima_posicao.latitude, c.ultima_posicao.longitude] as [number, number];
            }
            return [c.origem_lat, c.origem_lng] as [number, number];
          })
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [cargas, lastUpdate, cargaSelecionadaId]);

  function adicionarMarcador(
    map: L.Map,
    carga: Carga,
    lat: number,
    lng: number,
    naOrigem: boolean
  ) {
    // Criar ícone customizado baseado no status
    const icon = criarIconeCarga(carga, naOrigem);
    
    const marker = L.marker([lat, lng], { icon })
      .addTo(map)
      .bindPopup(criarPopupContent(carga));

    // Adicionar evento de click
    marker.on('click', () => {
      setCargaSelecionadaId(carga.id);
      if (onCargaClick) onCargaClick(carga);
    });

    markersRef.current.set(carga.id, marker);
  }

  function criarIconeCarga(carga: Carga, naOrigem: boolean): L.DivIcon {
    const corStatus = carga.status_prazo === 'no_prazo' ? '#10b981' :
                     carga.status_prazo === 'atrasado' ? '#ef4444' :
                     '#3b82f6';

    const iconHtml = `
      <div class="relative">
        <div class="absolute -inset-2 ${naOrigem ? 'bg-yellow-400' : ''} rounded-full animate-ping opacity-75"></div>
        <div class="relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg" style="background-color: ${corStatus}">
          <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
          </svg>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-marker',
      html: iconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24]
    });
  }

  function criarPopupContent(carga: Carga): string {
    const statusLabel = carga.status_prazo === 'no_prazo' ? '🟢 No Prazo' :
                       carga.status_prazo === 'atrasado' ? '🔴 Atrasado' :
                       '🔵 Adiantado';

    return `
      <div class="p-2 min-w-[250px]">
        <div class="font-bold text-lg mb-2">NF ${carga.nota_fiscal}</div>
        <div class="text-sm space-y-1">
          <div><strong>Status:</strong> ${statusLabel}</div>
          <div><strong>Origem:</strong> ${carga.origem_cidade}/${carga.origem_uf}</div>
          <div><strong>Destino:</strong> ${carga.destino_cidade}/${carga.destino_uf}</div>
          <div><strong>Motorista:</strong> ${carga.motorista_nome || 'Não informado'}</div>
          <div><strong>Placa:</strong> ${carga.placa_veiculo || 'Não informado'}</div>
          ${carga.ultima_posicao ? `
            <div class="text-xs text-gray-500 mt-2">
              Última atualização: ${new Date(carga.ultima_posicao.timestamp).toLocaleString('pt-BR')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <div id="mapa-rastreamento" className="w-full h-full min-h-[500px]" />
      
      {/* Indicador de auto-refresh */}
      {autoRefresh && (
        <div className="absolute top-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-700">
            Atualização automática ativa
          </span>
        </div>
      )}

      {/* Legenda */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-md">
        <div className="text-sm font-semibold mb-2">Legenda:</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>No Prazo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>Atrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full" />
            <span>Adiantado</span>
          </div>
        </div>
      </div>

      {/* Contador de cargas */}
      <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md">
        <div className="text-sm">
          <span className="font-semibold">{cargas.length}</span>
          <span className="text-gray-600 ml-1">
            {cargas.length === 1 ? 'carga' : 'cargas'} rastreada{cargas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
