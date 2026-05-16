// ============================================
// MAIN.JS - SCRIPT PRINCIPAL D'INITIALISATION
// Anime & Manga Info - Coordinateur global
// ============================================

// ============================================
// CONFIGURATION GLOBALE
// ============================================
const APP_CONFIG = {
  name: 'Anime & Manga Info',
  version: '2.0.0',
  apiBase: 'https://api.jikan.moe/v4',
  corsProxy: 'https://corsproxy.io/?url=',
  enableSW: true,
  enableAnalytics: false,
  debug: false,
  maxEpisodes: 500,
  itemsPerPage: 24
};

// État global de l'application
const AppState = {
  isOnline: navigator.onLine,
  isLoggedIn: false,
  currentUser: null,
  currentPage: 'home',
  currentTheme: 'dark',
  language: 'fr',
  notificationsEnabled: false
};

// ============================================
// INITIALISATION DE L'APPLICATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log(`🚀 ${APP_CONFIG.name} v${APP_CONFIG.version} - Démarrage`);
  
  // 1. Vérifier l'état de la connexion
  initNetworkListener();
  
  // 2. Initialiser le thème
  initTheme();
  
  // 3. Enregistrer le Service Worker
  if (APP_CONFIG.enableSW && 'serviceWorker' in navigator) {
    registerServiceWorker();
  }
  
  // 4. Demander la permission pour les notifications
  if (Notification.permission === 'default') {
    // Attend une interaction utilisateur pour demander
    document.addEventListener('click', requestNotificationPermission, { once: true });
  }
  
  // 5. Charger les préférences utilisateur
  loadUserPreferences();
  
  // 6. Initialiser la gestion des erreurs globales
  initErrorHandling();
  
  // 7. Afficher un message de bienvenue
  if (!sessionStorage.getItem('welcomeShown')) {
    setTimeout(() => {
      showWelcomeMessage();
      sessionStorage.setItem('welcomeShown', 'true');
    }, 1000);
  }
});

// ============================================
// GESTION DU RÉSEAU
// ============================================
function initNetworkListener() {
  window.addEventListener('online', () => {
    AppState.isOnline = true;
    showToast('📡 Connexion rétablie', 'success');
    hideOfflineBanner();
    // Recharger les données
    refreshCurrentPage();
  });
  
  window.addEventListener('offline', () => {
    AppState.isOnline = false;
    showToast('⚠️ Connexion perdue - Mode hors-ligne activé', 'warning');
    showOfflineBanner();
  });
}

function showOfflineBanner() {
  let banner = document.getElementById('offline-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'offline-banner';
    banner.innerHTML = `
      <div style="background: #d63031; color: white; text-align: center; padding: 0.5rem; position: sticky; top: 0; z-index: 1000;">
        ⚠️ Mode hors-ligne - Certaines fonctionnalités sont limitées
      </div>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  }
}

function hideOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
}

function refreshCurrentPage() {
  const currentPath = window.location.pathname;
  if (currentPath === '/' || currentPath === '/index.html') {
    if (typeof loadAnimes === 'function') loadAnimes(1, '');
  } else if (currentPath.includes('anime-detail') && typeof loadContent === 'function') {
    loadContent();
  }
}

// ============================================
// SERVICE WORKER
// ============================================
async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('✅ Service Worker enregistré:', registration.scope);
    
    // Vérifier les mises à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      console.log('📦 Nouveau Service Worker trouvé');
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });
    
    // Vérifier la mise à jour périodiquement
    setInterval(() => {
      registration.update();
    }, 3600000); // 1 heure
    
  } catch (error) {
    console.error('❌ Erreur Service Worker:', error);
  }
}

function showUpdateNotification() {
  const updateToast = document.createElement('div');
  updateToast.innerHTML = `
    <div style="position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); background: #1a1a2e; padding: 1rem 1.5rem; border-radius: 50px; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border-left: 4px solid #e94560;">
      ✨ Nouvelle version disponible !
      <button onclick="location.reload()" style="margin-left: 1rem; background: #e94560; border: none; padding: 0.3rem 0.8rem; border-radius: 20px; color: white; cursor: pointer;">Actualiser</button>
    </div>
  `;
  document.body.appendChild(updateToast);
  setTimeout(() => updateToast.remove(), 10000);
}

// ============================================
// THÈME
// ============================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  AppState.currentTheme = savedTheme;
  applyTheme(savedTheme);
  
  // Ajouter un bouton de changement de thème si nécessaire
  addThemeToggle();
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.style.setProperty('--bg-dark', '#f5f5f5');
    document.documentElement.style.setProperty('--bg-card', '#ffffff');
    document.documentElement.style.setProperty('--bg-hover', '#eeeeee');
    document.documentElement.style.setProperty('--text-light', '#1a1a2e');
    document.documentElement.style.setProperty('--text-muted', '#666666');
    document.documentElement.style.setProperty('--border', '#dddddd');
  } else {
    document.documentElement.style.setProperty('--bg-dark', '#0a0a0f');
    document.documentElement.style.setProperty('--bg-card', '#13131f');
    document.documentElement.style.setProperty('--bg-hover', '#1e1e2e');
    document.documentElement.style.setProperty('--text-light', '#f0f0f0');
    document.documentElement.style.setProperty('--text-muted', '#8888aa');
    document.documentElement.style.setProperty('--border', '#252540');
  }
}

function addThemeToggle() {
  const existingToggle = document.getElementById('themeToggle');
  if (existingToggle) return;
  
  const toggle = document.createElement('button');
  toggle.id = 'themeToggle';
  toggle.innerHTML = AppState.currentTheme === 'dark' ? '☀️' : '🌙';
  toggle.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #e94560;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    transition: all 0.2s;
  `;
  toggle.addEventListener('mouseenter', () => toggle.style.transform = 'scale(1.1)');
  toggle.addEventListener('mouseleave', () => toggle.style.transform = 'scale(1)');
  toggle.addEventListener('click', toggleTheme);
  document.body.appendChild(toggle);
}

function toggleTheme() {
  const newTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
  AppState.currentTheme = newTheme;
  localStorage.setItem('theme', newTheme);
  applyTheme(newTheme);
  
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
  
  showToast(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
}

// ============================================
// NOTIFICATIONS
// ============================================
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  
  try {
    const permission = await Notification.requestPermission();
    AppState.notificationsEnabled = permission === 'granted';
    if (permission === 'granted') {
      showToast('🔔 Notifications activées', 'success');
      // Afficher une notification de bienvenue
      setTimeout(() => {
        new Notification('Bienvenue sur Anime & Manga Info !', {
          body: 'Restez informé des nouvelles sorties et actualités.',
          icon: '/favicon.ico'
        });
      }, 2000);
    }
  } catch (error) {
    console.error('Erreur permission notification:', error);
  }
}

// ============================================
// PRÉFÉRENCES UTILISATEUR
// ============================================
function loadUserPreferences() {
  // Langue
  const savedLang = localStorage.getItem('language');
  if (savedLang) {
    AppState.language = savedLang;
  }
  
  // Notifications
  const savedNotifications = localStorage.getItem('notificationsEnabled');
  if (savedNotifications === 'true' && Notification.permission === 'granted') {
    AppState.notificationsEnabled = true;
  }
  
  // Épisodes par page
  const savedItemsPerPage = localStorage.getItem('itemsPerPage');
  if (savedItemsPerPage) {
    APP_CONFIG.itemsPerPage = parseInt(savedItemsPerPage);
  }
}

function saveUserPreferences() {
  localStorage.setItem('language', AppState.language);
  localStorage.setItem('notificationsEnabled', AppState.notificationsEnabled);
  localStorage.setItem('itemsPerPage', APP_CONFIG.itemsPerPage);
  localStorage.setItem('theme', AppState.currentTheme);
}

// ============================================
// GESTION DES ERREURS GLOBALES
// ============================================
function initErrorHandling() {
  // Erreurs non capturées
  window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    if (APP_CONFIG.debug) {
      showToast(`Erreur: ${event.error?.message || 'Erreur inconnue'}`, 'error');
    }
  });
  
  // Promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    if (APP_CONFIG.debug) {
      showToast(`Erreur: ${event.reason?.message || 'Erreur inconnue'}`, 'error');
    }
  });
}

// ============================================
// MESSAGE DE BIENVENUE
// ============================================
function showWelcomeMessage() {
  const hour = new Date().getHours();
  let greeting = '';
  if (hour < 12) greeting = 'Bonjour';
  else if (hour < 18) greeting = 'Bon après-midi';
  else greeting = 'Bonsoir';
  
  showToast(`${greeting} ! Bienvenue sur Anime & Manga Info 🎌`, 'success');
}

// ============================================
// UTILITAIRES GLOBAUX
// ============================================
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      visibility: hidden;
      min-width: 250px;
      background: #1a1a2e;
      color: white;
      text-align: center;
      border-radius: 8px;
      padding: 1rem;
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      border-left: 4px solid #e94560;
      transition: all 0.3s;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.visibility = 'visible';
  toast.style.opacity = '1';
  
  setTimeout(() => {
    toast.style.visibility = 'hidden';
    toast.style.opacity = '0';
  }, 3000);
}

// ============================================
// ANALYTICS (optionnel)
// ============================================
function trackPageView(pageName) {
  if (!APP_CONFIG.enableAnalytics) return;
  
  // Implémentation future pour analytics
  console.log(`[Analytics] Page view: ${pageName}`);
}

function trackEvent(category, action, label) {
  if (!APP_CONFIG.enableAnalytics) return;
  console.log(`[Analytics] Event: ${category} - ${action} - ${label}`);
}

// ============================================
// EXPORT DES FONCTIONS UTILES
// ============================================
window.App = {
  config: APP_CONFIG,
  state: AppState,
  showToast,
  toggleTheme,
  trackPageView,
  trackEvent,
  saveUserPreferences,
  loadUserPreferences
};

console.log('✅ main.js chargé - Application prête');
