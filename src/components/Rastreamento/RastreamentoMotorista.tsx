// components/Rastreamento/RastreamentoMotorista.tsx - Página Pública para Motorista

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { formatarDataHora } from '../../utils/formatters';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface CargaPublica {
  id: string;
  nota_fiscal: string;
  origem_cidade: string;
  origem_uf: string;
  destino_cidade: string;
  destino_uf: string;
  destino_lat: number | null;
  destino_lng: number | null;
  data_carregamento: string;
  prazo_entrega: string;
  status: string;
  motorista_nome: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function RastreamentoMotorista() {
  const { token } = useParams<{ token: string }>();
  const [carga, setCarga] = useState<CargaPublica | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [etapa, setEtapa] = useState<'autorizar' | 'mapa'>('autorizar');
  const [autorizando, setAutorizando] = useState(false);
  const [posicaoAtual, setPosicaoAtual] = useState<{ lat: number; lng: number } | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [entregue, setEntregue] = useState(false);
  const [confirmandoEntrega, setConfirmandoEntrega] = useState(false);
  const entregueRef = useRef(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const motoristaMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastRouteUpdateRef = useRef<number>(0);
  const ROUTE_UPDATE_INTERVAL = 30000; // Atualizar rota a cada 30s (estilo Uber/iFood)

  // Calcular distância entre dois pontos (Haversine)
  function calcularDistanciaLocal(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Marcar carga como entregue no banco
  async function confirmarEntrega() {
    if (!carga || entregueRef.current) return;
    entregueRef.current = true;
    setConfirmandoEntrega(true);
    try {
      const entregaRes = await fetch(`${SUPABASE_URL}/rest/v1/cargas?id=eq.${carga.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'entregue',
          data_entrega_real: new Date().toISOString()
        })
      });
      console.log('[MOTORISTA] PATCH entregue:', entregaRes.status);
      if (!entregaRes.ok) console.error('[MOTORISTA] PATCH entregue error:', await entregaRes.text());
      setEntregue(true);

      // Notificar empresa por email sobre entrega (fire-and-forget)
      fetch(`${SUPABASE_URL}/functions/v1/notificar-status-carga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ carga_id: carga.id, status: 'entregue' })
      }).catch(() => {});
      // Parar rastreamento GPS
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    } catch (err) {
      console.error('Erro ao confirmar entrega:', err);
      entregueRef.current = false;
    } finally {
      setConfirmandoEntrega(false);
    }
  }

  // Verificar proximidade do destino para entrega automática
  function verificarChegadaDestino(lat: number, lng: number) {
    if (!carga || entregueRef.current) return;
    const destLat = carga.destino_lat;
    const destLng = carga.destino_lng;
    if (!destLat || !destLng) return;
    const distancia = calcularDistanciaLocal(lat, lng, destLat, destLng);
    if (distancia <= 1) {
      // Motorista a menos de 1km do destino — marcar como entregue
      confirmarEntrega();
    }
  }

  // Buscar carga pelo token (público, sem auth)
  useEffect(() => {
    if (!token) {
      setError('Link inválido');
      setLoading(false);
      return;
    }

    async function carregarCarga() {
      try {
        console.log('[MOTORISTA] Buscando carga com token:', token);
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/cargas?link_rastreamento=eq.${token}&select=id,nota_fiscal,origem_cidade,origem_uf,destino_cidade,destino_uf,destino_lat,destino_lng,data_carregamento,prazo_entrega,status,motorista_nome&limit=1`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          }
        );

        console.log('[MOTORISTA] Response status:', response.status);
        if (!response.ok) {
          const errText = await response.text();
          console.error('[MOTORISTA] Erro response:', errText);
          throw new Error('Erro ao carregar dados');
        }
        const rows = await response.json();
        console.log('[MOTORISTA] Rows encontradas:', rows?.length);
        if (!rows?.length) throw new Error('Link expirado ou inválido');

        setCarga(rows[0]);
      } catch (err: any) {
        console.error('[MOTORISTA] Erro:', err);
        setError(err.message || 'Erro ao carregar informações');
      } finally {
        setLoading(false);
      }
    }

    carregarCarga();
  }, [token]);

  // Geocodificar destino se não tiver lat/lng
  const geocodeDestino = useCallback(async (cidade: string, uf: string): Promise<{ lat: number; lng: number } | null> => {
    if (!MAPBOX_TOKEN) return null;
    try {
      const query = encodeURIComponent(`${cidade}, ${uf}, Brazil`);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?country=BR&types=place&limit=1&access_token=${MAPBOX_TOKEN}`
      );
      const data = await res.json();
      if (data.features?.length) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (err) {
      console.error('Erro geocoding destino:', err);
    }
    return null;
  }, []);

  // Buscar rota do Mapbox
  const fetchRoute = useCallback(async (from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<[number, number][]> => {
    if (!MAPBOX_TOKEN) return [];
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes?.length) {
        return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
      }
    } catch (err) {
      console.error('Erro ao buscar rota:', err);
    }
    return [];
  }, []);

  // Inicializar mapa
  const initMap = useCallback(async (motorista: { lat: number; lng: number }) => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!carga) return;

    // Determinar destino
    let destino: { lat: number; lng: number } | null = null;
    if (carga.destino_lat && carga.destino_lng) {
      destino = { lat: carga.destino_lat, lng: carga.destino_lng };
    } else {
      destino = await geocodeDestino(carga.destino_cidade, carga.destino_uf);
    }

    const map = L.map(mapContainerRef.current, {
      center: [motorista.lat, motorista.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Marcador do motorista (verde com ícone de caminhão)
    const motoristaIcon = L.divIcon({
      className: '',
      html: `<div style="position:relative;width:48px;height:48px;">
        <div style="position:absolute;inset:0;background:#10b981;border-radius:50%;opacity:0.3;animation:pulse 2s infinite;"></div>
        <div style="position:absolute;inset:4px;background:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
          </svg>
        </div>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1);opacity:0.3}50%{transform:scale(2);opacity:0}}</style>`,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    const motoristaMarker = L.marker([motorista.lat, motorista.lng], { icon: motoristaIcon })
      .addTo(map)
      .bindPopup('Sua localização');

    motoristaMarkerRef.current = motoristaMarker;
    mapRef.current = map;

    // Se temos destino, desenhar rota
    if (destino) {
      // Marcador do destino (vermelho)
      const destinoIcon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#EF4444" stroke="white" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([destino.lat, destino.lng], { icon: destinoIcon })
        .addTo(map)
        .bindPopup(`Destino: ${carga.destino_cidade}/${carga.destino_uf}`);

      // Buscar e desenhar rota
      const routeCoords = await fetchRoute(motorista, destino);
      if (routeCoords.length > 0) {
        const routeLine = L.polyline(routeCoords, {
          color: '#3B82F6',
          weight: 5,
          opacity: 0.8,
          smoothFactor: 1
        }).addTo(map);
        routeLayerRef.current = routeLine;

        // Ajustar zoom para mostrar toda a rota
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
      } else {
        // Sem rota, ajustar para mostrar ambos os pontos
        const bounds = L.latLngBounds([
          [motorista.lat, motorista.lng],
          [destino.lat, destino.lng]
        ]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Forçar resize
    setTimeout(() => map.invalidateSize(), 200);
  }, [carga, geocodeDestino, fetchRoute]);

  // Atualizar posição do motorista no mapa
  const atualizarPosicaoNoMapa = useCallback(async (lat: number, lng: number) => {
    if (motoristaMarkerRef.current) {
      motoristaMarkerRef.current.setLatLng([lat, lng]);
    }

    // Atualizar rota com throttle (a cada 30s) — estilo Uber/iFood
    // A rota é recalculada da posição ATUAL até o destino,
    // fazendo o trecho já percorrido desaparecer naturalmente
    const now = Date.now();
    if (now - lastRouteUpdateRef.current < ROUTE_UPDATE_INTERVAL) return;
    lastRouteUpdateRef.current = now;

    if (carga && mapRef.current) {
      let destino: { lat: number; lng: number } | null = null;
      if (carga.destino_lat && carga.destino_lng) {
        destino = { lat: carga.destino_lat, lng: carga.destino_lng };
      }

      if (destino) {
        const routeCoords = await fetchRoute({ lat, lng }, destino);
        if (routeCoords.length > 0) {
          if (routeLayerRef.current) {
            routeLayerRef.current.setLatLngs(routeCoords);
          } else {
            routeLayerRef.current = L.polyline(routeCoords, {
              color: '#3B82F6',
              weight: 5,
              opacity: 0.8,
              smoothFactor: 1
            }).addTo(mapRef.current);
          }
        }
      }
    }
  }, [carga, fetchRoute]);

  // Autorizar e iniciar rastreamento
  async function handleAutorizar() {
    if (!token || !carga) return;

    try {
      setAutorizando(true);
      setError('');

      // Pedir permissão de geolocalização
      const posicao = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const pos = {
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude
      };
      setPosicaoAtual(pos);
      setUltimaAtualizacao(new Date());

      // 1) Mudar status para em_transito
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/cargas?id=eq.${carga.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'em_transito' })
      });
      console.log('[MOTORISTA] PATCH status em_transito:', patchRes.status);
      if (!patchRes.ok) console.error('[MOTORISTA] PATCH error:', await patchRes.text());

      // 2) Invalidar link de rastreamento (separado para evitar conflito de RLS)
      fetch(`${SUPABASE_URL}/rest/v1/cargas?id=eq.${carga.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ link_rastreamento: null })
      }).catch(() => {});

      // Notificar empresa que carga entrou em trânsito (fire-and-forget)
      fetch(`${SUPABASE_URL}/functions/v1/notificar-status-carga`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ carga_id: carga.id, status: 'em_transito' })
      }).catch(() => {});

      // Salvar posição inicial no banco
      fetch(`${SUPABASE_URL}/rest/v1/posicoes_gps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify({
          carga_id: carga.id,
          latitude: pos.lat,
          longitude: pos.lng,
          velocidade: posicao.coords.speed,
          precisao_metros: posicao.coords.accuracy,
          origem: 'api_rastreamento',
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});

      // Mudar para tela do mapa
      setEtapa('mapa');

      // Iniciar watch contínuo
      const watchId = navigator.geolocation.watchPosition(
        (newPos) => {
          const newLatLng = { lat: newPos.coords.latitude, lng: newPos.coords.longitude };
          setPosicaoAtual(newLatLng);
          setUltimaAtualizacao(new Date());
          atualizarPosicaoNoMapa(newLatLng.lat, newLatLng.lng);

          // Verificar se chegou ao destino
          verificarChegadaDestino(newLatLng.lat, newLatLng.lng);

          // Salvar no banco (a cada atualização)
          fetch(`${SUPABASE_URL}/rest/v1/posicoes_gps`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
              carga_id: carga.id,
              latitude: newLatLng.lat,
              longitude: newLatLng.lng,
              velocidade: newPos.coords.speed,
              precisao_metros: newPos.coords.accuracy,
              origem: 'api_rastreamento',
              timestamp: new Date().toISOString()
            })
          }).catch(() => {});
        },
        (err) => console.error('Erro watch position:', err),
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
      watchIdRef.current = watchId;

    } catch (err: any) {
      if (err.code === 1) {
        setError('Permissão de localização negada. Habilite nas configurações do navegador.');
      } else if (err.code === 2) {
        setError('Não foi possível obter sua localização. Verifique se o GPS está ativado.');
      } else if (err.code === 3) {
        setError('Tempo esgotado ao obter localização. Tente novamente.');
      } else {
        setError(err.message || 'Erro ao iniciar rastreamento');
      }
    } finally {
      setAutorizando(false);
    }
  }

  // Inicializar mapa quando mudar para etapa 'mapa'
  useEffect(() => {
    if (etapa === 'mapa' && posicaoAtual && !mapRef.current) {
      // Pequeno delay para garantir que o container está renderizado
      setTimeout(() => initMap(posicaoAtual), 100);
    }
  }, [etapa, posicaoAtual, initMap]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // --- TELA DE LOADING ---
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

  // --- TELA DE ERRO ---
  if (error && !carga) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  // --- TELA DO MAPA (após autorização) ---
  if (etapa === 'mapa' && carga) {
    return (
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header compacto */}
        <div className="bg-white shadow-md px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-semibold text-gray-800">Rastreamento Ativo</span>
          </div>
          <span className="text-xs text-gray-500">
            NF: {carga.nota_fiscal}
          </span>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="absolute inset-0" />
        </div>

        {/* Painel inferior com informações */}
        <div className="bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] rounded-t-2xl px-4 py-4 flex-shrink-0">
          {/* Rota */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <div className="w-0.5 h-6 bg-gray-300"></div>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{carga.origem_cidade}/{carga.origem_uf}</div>
              <div className="text-xs text-gray-400 my-0.5">em trânsito</div>
              <div className="text-sm font-medium text-gray-900">{carga.destino_cidade}/{carga.destino_uf}</div>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Saída</div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">
                {carga.data_carregamento ? formatarDataHora(carga.data_carregamento) : '-'}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">Previsão de Chegada</div>
              <div className="text-xs font-bold text-gray-900 mt-0.5">
                {carga.prazo_entrega ? formatarDataHora(carga.prazo_entrega) : '-'}
              </div>
            </div>
          </div>

          {/* Botão Confirmar Entrega */}
          {!entregue ? (
            <button
              onClick={confirmarEntrega}
              disabled={confirmandoEntrega}
              className="w-full mt-3 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              {confirmandoEntrega ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Confirmando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirmar Entrega
                </>
              )}
            </button>
          ) : (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <svg className="w-8 h-8 text-green-600 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800 font-bold text-sm">Entrega Confirmada!</p>
              <p className="text-green-600 text-xs">Obrigado pelo seu trabalho!</p>
            </div>
          )}

          {/* Última atualização */}
          {ultimaAtualizacao && (
            <div className="text-center text-[10px] text-gray-400 mt-2">
              Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- TELA DE AUTORIZAÇÃO (padrão) ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white text-center">
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <h1 className="text-xl font-bold">Rastreamento de Carga</h1>
            <p className="text-blue-200 text-sm mt-1">BratCargas</p>
          </div>

          <div className="p-6">
            {/* Saudação */}
            {carga?.motorista_nome && (
              <p className="text-center text-gray-700 mb-4">
                Olá, <span className="font-semibold">{carga.motorista_nome}</span>!
              </p>
            )}

            {/* Info da carga */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Nota Fiscal</span>
                <span className="font-bold text-gray-900">{carga?.nota_fiscal}</span>
              </div>
              <div className="border-t pt-3 flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  <div className="w-0.5 h-5 bg-gray-300"></div>
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{carga?.origem_cidade}/{carga?.origem_uf}</div>
                  <div className="text-sm text-gray-900 mt-2">{carga?.destino_cidade}/{carga?.destino_uf}</div>
                </div>
              </div>
              <div className="border-t pt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Saída:</span>
                  <div className="font-semibold text-gray-800">
                    {carga?.data_carregamento ? formatarDataHora(carga.data_carregamento) : '-'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Previsão:</span>
                  <div className="font-semibold text-gray-800">
                    {carga?.prazo_entrega ? formatarDataHora(carga.prazo_entrega) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Botão de autorizar */}
            {(carga?.status === 'aguardando' || carga?.status === 'em_transito') ? (
              <>
                <button
                  onClick={handleAutorizar}
                  disabled={autorizando}
                  className="w-full py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold text-lg rounded-xl transition shadow-lg flex items-center justify-center gap-3"
                >
                  {autorizando ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      Autorizando...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Autorizar Localização
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400 mt-3">
                  Ao autorizar, sua localização será compartilhada em tempo real para acompanhamento da entrega.
                </p>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <svg className="w-12 h-12 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-green-900">Carga Entregue!</h3>
                <p className="text-green-700 text-sm mt-1">Obrigado pelo seu trabalho!</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/70 text-xs mt-4">
          <p>&copy; 2025 BratCargas - Sistema de Rastreamento</p>
        </div>
      </div>
    </div>
  );
}
