const TILE_CACHE = 'map-tiles-v1';
const MAX_CACHE_SIZE = 500; // Máximo de tiles cacheados

// Instalar Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('map-tiles-') && key !== TILE_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Interceptar requests de tiles
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Só cachear tiles de mapa (OpenStreetMap e Mapbox)
  const isTile =
    url.includes('tile.openstreetmap.org') ||
    url.includes('api.mapbox.com/styles') ||
    url.includes('tiles.mapbox.com');

  if (!isTile) return; // Ignorar outras requests

  event.respondWith(
    caches.open(TILE_CACHE).then(async (cache) => {
      // Tentar servir do cache primeiro
      const cached = await cache.match(event.request);
      if (cached) return cached;

      // Se não está no cache, buscar da rede
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          // Salvar no cache para próxima vez
          cache.put(event.request, response.clone());

          // Limpar cache se ficou muito grande
          trimCache(cache, MAX_CACHE_SIZE);
        }
        return response;
      } catch (err) {
        // Se rede falhar e não tem cache, retornar erro silencioso
        return new Response('', { status: 408, statusText: 'Tile not available offline' });
      }
    })
  );
});

// Manter o cache dentro do limite
async function trimCache(cache, maxSize) {
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    // Deletar os mais antigos (primeiros adicionados)
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  }
}
