// ============================================
// SERVICE WORKER - ANIME & MANGA INFO
// Version simplifiée et robuste
// ============================================

const CACHE_NAME = 'anime-info-v1';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache (UNIQUEMENT ceux qui existent)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css'
  // Ne mettez que les fichiers qui existent vraiment !
];

// ============================================
// INSTALLATION
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Ne mettre en cache que les fichiers qui existent
      for (const url of STATIC_CACHE_URLS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            console.log(`[SW] Cache OK: ${url}`);
          } else {
            console.warn(`[SW] Fichier non trouvé: ${url}`);
          }
        } catch (error) {
          console.warn(`[SW] Impossible de cacher: ${url}`, error);
        }
      }
      
      console.log('[SW] Installation terminée');
    })()
  );
  
  self.skipWaiting();
});

// ============================================
// ACTIVATION
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation...');
  
  event.waitUntil(
    (async () => {
      // Supprimer les anciens caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Suppression ancien cache: ${name}`);
            return caches.delete(name);
          })
      );
      
      console.log('[SW] Activation terminée');
    })()
  );
  
  self.clients.claim();
});

// ============================================
// STRATÉGIE DE CACHE SIMPLIFIÉE
// ============================================

// Cache d'abord pour les ressources statiques
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {}
  
  return new Response('Ressource non disponible', { status: 404 });
}

// Réseau d'abord pour les pages HTML
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Page hors-ligne
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_URL);
    }
  }
  
  return new Response('Ressource non disponible', { status: 404 });
}

// ============================================
// ROUTAGE DES REQUÊTES
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // IGNORER les requêtes API et externes
  if (url.href.includes('api.jikan.moe') || 
      url.href.includes('firebase') ||
      url.href.includes('gstatic.com') ||
      url.href.includes('corsproxy.io')) {
    return; // Laisser passer normalement
  }
  
  // Cache First pour les ressources statiques
  if (url.pathname.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|webp|json)$/i)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // Network First pour les pages HTML
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Par défaut, essayer le cache puis le réseau
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// ============================================
// GESTION DES NOTIFICATIONS (optionnel)
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  let data = {
    title: 'Anime & Manga Info',
    body: 'Nouveau contenu disponible !',
    icon: '/favicon.ico',
    tag: 'anime-notification',
    url: '/'
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (error) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      tag: data.tag,
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================
// MESSAGE HANDLER
// ============================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache effacé');
        if (event.source) {
          event.source.postMessage({ action: 'cacheCleared' });
        }
      })
    );
  }
});

console.log('[SW] Service Worker chargé');
