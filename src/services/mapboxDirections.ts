// services/mapboxDirections.ts

export type MapboxProfile = 'driving' | 'driving-traffic' | 'walking' | 'cycling';

export interface MapboxDirectionsPoint {
  lat: number;
  lng: number;
}

export interface MapboxRouteResult {
  coordinatesLatLng: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

export async function getMapboxRoute(params: {
  from: MapboxDirectionsPoint;
  to: MapboxDirectionsPoint;
  profile?: MapboxProfile;
}): Promise<MapboxRouteResult> {
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

  if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN não configurado');
  }

  const profile = params.profile ?? 'driving';

  const from = `${params.from.lng},${params.from.lat}`;
  const to = `${params.to.lng},${params.to.lat}`;

  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${from};${to}`);
  url.searchParams.set('geometries', 'geojson');
  url.searchParams.set('overview', 'full');
  url.searchParams.set('steps', 'true');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Erro Mapbox Directions (${response.status}): ${text}`);
  }

  const data: any = await response.json();

  if (!data?.routes?.length) {
    throw new Error('Mapbox Directions: nenhuma rota retornada');
  }

  const route = data.routes[0];
  const coords: [number, number][] = (route.geometry?.coordinates ?? []).map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );

  if (!coords.length) {
    throw new Error('Mapbox Directions: rota retornou geometria vazia');
  }

  return {
    coordinatesLatLng: coords,
    distanceMeters: route.distance ?? 0,
    durationSeconds: route.duration ?? 0,
  };
}
