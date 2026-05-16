// ============================================
// SERVICE WORKER - ANIME & MANGA INFO
// Gestion du cache, mode hors-ligne, notifications
// ============================================

const CACHE_NAME = 'anime-info-v1';
const OFFLINE_URL = '/offline.html';

// Fichiers à mettre en cache (core)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/anime-detail.html',
  '/watch.html',
  '/profile.html',
  '/style.css',
  '/script.js',
  '/detail-page.js',
  '/watch.js',
  '/profile.js',
  '/firebase-config.js',
  '/offline.html',
  '/favicon.ico'
];

// Ressources externes à mettre en cache
const EXTERNAL_CACHE_URLS = [
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// ============================================
// INSTALLATION - Cache des assets statiques
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Cache des fichiers statiques
      await cache.addAll(STATIC_CACHE_URLS);
      
      // Tentative de cache des ressources externes (ignore les erreurs)
      for (const url of EXTERNAL_CACHE_URLS) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn(`[SW] Impossible de cacher: ${url}`, error);
        }
      }
      
      // Cache de la page offline
      try {
        const offlineResponse = await fetch(OFFLINE_URL);
        if (offlineResponse.ok) {
          await cache.put(OFFLINE_URL, offlineResponse);
        }
      } catch (error) {
        console.warn('[SW] Page offline non disponible', error);
      }
      
      console.log('[SW] Installation terminée');
    })()
  );
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// ============================================
// ACTIVATION - Nettoyage des anciens caches
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
          .map((name) => caches.delete(name))
      );
      
      console.log('[SW] Activation terminée');
    })()
  );
  
  // Prendre le contrôle des clients ouverts
  self.clients.claim();
});

// ============================================
// STRATÉGIE DE CACHE - Network First avec fallback
// ============================================
async function networkFirst(request) {
  try {
    // Tentative réseau
    const networkResponse = await fetch(request);
    
    // Si succès, mettre en cache
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    throw new Error('Réseau indisponible');
  } catch (error) {
    // Fallback cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback page offline pour les pages HTML
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_URL);
    }
    
    // Fallback image placeholder
    if (request.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#1a1a2e"/><text x="100" y="110" text-anchor="middle" fill="#888" font-size="14">Image non disponible</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    return new Response('Ressource non disponible', { status: 404 });
  }
}

// Stratégie Cache First pour les ressources statiques
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

// ============================================
// ROUTAGE DES REQUÊTES
// ============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Exclure les requêtes API (ne pas cacher les données dynamiques)
  if (url.href.includes('api.jikan.moe') || 
      url.href.includes('firestore.googleapis.com') ||
      url.href.includes('corsproxy.io')) {
    return; // Laisser passer les requêtes API normalement
  }
  
  // Stratégie Cache First pour les ressources statiques
  if (url.pathname.match(/\.(css|js|ico|png|jpg|jpeg|gif|svg|webp)$/i)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }
  
  // Stratégie Network First pour les pages HTML
  if (url.pathname.match(/\.html$/) || url.pathname === '/' || url.pathname === '') {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Stratégie Network First par défaut
  event.respondWith(networkFirst(event.request));
});

// ============================================
// NOTIFICATIONS PUSH
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  let data = {
    title: 'Anime & Manga Info',
    body: 'Nouveau contenu disponible !',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
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
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    requireInteraction: false,
    data: { url: data.url }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ============================================
// CLIC SUR NOTIFICATION
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });
      
      // Vérifier si une fenêtre est déjà ouverte
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })()
  );
});

// ============================================
// SYNC EN ARRIÈRE-PLAN
// ============================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync en arrière-plan:', event.tag);
  
  if (event.tag === 'sync-progress') {
    event.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  // Récupérer les progressions non synchronisées
  try {
    const cache = await caches.open(CACHE_NAME);
    const pendingRequests = await cache.keys();
    
    for (const request of pendingRequests) {
      if (request.url.includes('/sync-progress')) {
        const response = await cache.match(request);
        if (response) {
          const data = await response.json();
          // Envoyer au serveur (Firestore)
          // Implémentation à compléter selon besoin
          await cache.delete(request);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Erreur sync:', error);
  }
}

// ============================================
// MISE À JOUR
// ============================================
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearCache') {
    event.waitUntil(
      (async () => {
        await caches.delete(CACHE_NAME);
        console.log('[SW] Cache effacé');
        if (event.source) {
          event.source.postMessage({ action: 'cacheCleared' });
        }
      })()
    );
  }
});
