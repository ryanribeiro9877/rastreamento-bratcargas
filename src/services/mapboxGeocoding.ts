export interface MapboxGeocodingResult {
  lat: number;
  lng: number;
  placeName?: string;
}

const cache = new Map<string, MapboxGeocodingResult>();

export async function geocodeCidadeUf(params: {
  cidade: string;
  uf: string;
}): Promise<MapboxGeocodingResult> {
  const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
  if (!accessToken) {
    throw new Error('VITE_MAPBOX_ACCESS_TOKEN não configurado');
  }

  const cidade = params.cidade.trim();
  const uf = params.uf.trim();
  const key = `${cidade.toLowerCase()}|${uf.toLowerCase()}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const query = `${cidade}, ${uf}, Brasil`;
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('country', 'BR');
  url.searchParams.set('limit', '1');
  url.searchParams.set('types', 'place,locality');

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Erro Mapbox Geocoding (${response.status}): ${text}`);
  }

  const data: any = await response.json();
  const feature = data?.features?.[0];
  const center = feature?.center;

  if (!Array.isArray(center) || center.length < 2) {
    throw new Error(`Não foi possível geocodificar: ${cidade}/${uf}`);
  }

  const result: MapboxGeocodingResult = {
    lng: center[0],
    lat: center[1],
    placeName: feature?.place_name
  };

  cache.set(key, result);
  return result;
}
