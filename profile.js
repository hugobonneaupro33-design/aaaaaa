// ============================================
// PROFIL UTILISATEUR - ANIME & MANGA INFO
// Gestion des favoris, historique et statistiques
// ============================================

// ============================================
// VARIABLES GLOBALES
// ============================================
let userData = {
  favorites: [],
  history: [],
  stats: {
    animesWatched: 0,
    episodesWatched: 0,
    totalHours: 0,
    memberSince: null
  }
};

let currentTab = 'favorites';
let isLoading = false;

// ============================================
// CHARGEMENT PRINCIPAL
// ============================================
async function loadProfile() {
  const container = document.getElementById('profileContent');
  
  if (!currentUser) {
    showNotLoggedIn(container);
    return;
  }

  await loadUserDataFromFirestore();
  renderProfileUI();
  attachEventListeners();
}

function showNotLoggedIn(container) {
  container.innerHTML = `
    <div class="profile-header">
      <div class="empty-state">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <h3>🔐 Vous n'êtes pas connecté</h3>
        <p>Connectez-vous pour accéder à votre profil et sauvegarder vos animes.</p>
        <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button onclick="loginWithGoogle()" class="google-btn" style="padding: 0.8rem 1.5rem; border-radius: 40px;">
            🔵 Se connecter avec Google
          </button>
          <button onclick="loginWithFacebook()" class="facebook-btn" style="padding: 0.8rem 1.5rem; border-radius: 40px;">
            📘 Se connecter avec Facebook
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// FIRESTORE - LECTURE/ÉCRITURE
// ============================================
async function loadUserDataFromFirestore() {
  if (!db || !currentUser) return;
  
  try {
    const docRef = db.collection('users').doc(currentUser.uid);
    const doc = await docRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      userData = {
        favorites: data.favorites || [],
        history: data.history || [],
        stats: {
          animesWatched: data.stats?.animesWatched || 0,
          episodesWatched: data.stats?.episodesWatched || 0,
          totalHours: data.stats?.totalHours || 0,
          memberSince: data.memberSince || new Date().toISOString()
        }
      };
    } else {
      // Premier connexion - créer le profil
      userData = {
        favorites: [],
        history: [],
        stats: {
          animesWatched: 0,
          episodesWatched: 0,
          totalHours: 0,
          memberSince: new Date().toISOString()
        }
      };
      await saveUserDataToFirestore();
    }
  } catch (error) {
    console.error('Erreur chargement Firestore:', error);
    showToast('Erreur de chargement des données', 'error');
  }
}

async function saveUserDataToFirestore() {
  if (!db || !currentUser) return;
  
  try {
    await db.collection('users').doc(currentUser.uid).set({
      favorites: userData.favorites,
      history: userData.history,
      stats: userData.stats,
      memberSince: userData.stats.memberSince,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
  }
}

// ============================================
// AJOUTER À L'HISTORIQUE
// ============================================
async function addToHistory(animeId, animeTitle, episode, imageUrl) {
  if (!currentUser) return;
  
  const historyItem = {
    id: animeId,
    title: animeTitle,
    episode: episode,
    image: imageUrl,
    date: new Date().toISOString()
  };
  
  // Vérifier si l'anime existe déjà dans l'historique
  const existingIndex = userData.history.findIndex(item => item.id === animeId);
  if (existingIndex !== -1) {
    userData.history[existingIndex] = historyItem;
  } else {
    userData.history.unshift(historyItem);
  }
  
  // Limiter l'historique à 50 entrées
  if (userData.history.length > 50) {
    userData.history = userData.history.slice(0, 50);
  }
  
  await saveUserDataToFirestore();
}

// ============================================
// AJOUTER/SUPPRIMER FAVORIS
// ============================================
async function toggleFavorite(animeId, animeTitle, animeScore, imageUrl) {
  if (!currentUser) return false;
  
  const existingIndex = userData.favorites.findIndex(fav => fav.id === animeId);
  
  if (existingIndex !== -1) {
    // Supprimer des favoris
    userData.favorites.splice(existingIndex, 1);
    showToast(`❌ ${animeTitle} retiré des favoris`);
    return false;
  } else {
    // Ajouter aux favoris
    userData.favorites.push({
      id: animeId,
      title: animeTitle,
      score: animeScore,
      image: imageUrl,
      dateAdded: new Date().toISOString()
    });
    showToast(`❤️ ${animeTitle} ajouté aux favoris`);
    return true;
  }
}

async function isFavorite(animeId) {
  if (!currentUser) return false;
  return userData.favorites.some(fav => fav.id === animeId);
}

// ============================================
// STATISTIQUES
// ============================================
async function updateStats(animeId, episodeCount) {
  if (!currentUser) return;
  
  // Vérifier si l'anime n'a pas déjà été compté
  if (!userData.stats.watchedAnimes) {
    userData.stats.watchedAnimes = [];
  }
  
  if (!userData.stats.watchedAnimes.includes(animeId)) {
    userData.stats.watchedAnimes.push(animeId);
    userData.stats.animesWatched = userData.stats.watchedAnimes.length;
  }
  
  userData.stats.episodesWatched += episodeCount;
  userData.stats.totalHours = Math.floor(userData.stats.episodesWatched * 24 / 60);
  
  await saveUserDataToFirestore();
}

// ============================================
// RENDU DE L'INTERFACE
// ============================================
function renderProfileUI() {
  const container = document.getElementById('profileContent');
  
  container.innerHTML = `
    <!-- Profile Header -->
    <div class="profile-header">
      <img id="profileAvatar" class="profile-avatar-large" src="${currentUser.photoURL || 'https://via.placeholder.com/120x120?text=Avatar'}" alt="Avatar">
      <h2 id="profileName">${escapeHtml(currentUser.displayName) || escapeHtml(currentUser.email)}</h2>
      <p id="profileEmail">${escapeHtml(currentUser.email)}</p>
      <div class="profile-actions">
        <button id="editProfileBtn" class="action-btn">✏️ Modifier</button>
        <button id="refreshDataBtn" class="action-btn">🔄 Actualiser</button>
        <button id="exportDataBtn" class="action-btn">📥 Exporter</button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number" id="statAnimes">${userData.stats.animesWatched}</div>
        <div class="stat-label">Animes vus</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="statFavorites">${userData.favorites.length}</div>
        <div class="stat-label">Favoris</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="statEpisodes">${userData.stats.episodesWatched}</div>
        <div class="stat-label">Épisodes regardés</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" id="statHours">${userData.stats.totalHours}</div>
        <div class="stat-label">Heures visionnées</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="profile-tabs">
      <button class="profile-tab ${currentTab === 'favorites' ? 'active' : ''}" data-tab="favorites">❤️ Favoris</button>
      <button class="profile-tab ${currentTab === 'history' ? 'active' : ''}" data-tab="history">📜 Historique</button>
      <button class="profile-tab ${currentTab === 'stats' ? 'active' : ''}" data-tab="stats">📊 Statistiques</button>
    </div>

    <!-- Tab: Favoris -->
    <div id="tabFavorites" class="tab-content ${currentTab === 'favorites' ? 'active' : ''}">
      <div class="profile-section">
        <div class="section-header">
          <h3>❤️ Mes animes favoris</h3>
          <span class="badge-count">${userData.favorites.length}</span>
        </div>
        <div id="favoritesList" class="favorites-grid">
          ${renderFavoritesList()}
        </div>
      </div>
    </div>

    <!-- Tab: Historique -->
    <div id="tabHistory" class="tab-content ${currentTab === 'history' ? 'active' : ''}">
      <div class="profile-section">
        <div class="section-header">
          <h3>📜 Historique de visionnage</h3>
          <button id="clearHistoryBtn" class="clear-btn">🗑️ Tout effacer</button>
        </div>
        <div id="historyList" class="history-list">
          ${renderHistoryList()}
        </div>
      </div>
    </div>

    <!-- Tab: Statistiques -->
    <div id="tabStats" class="tab-content ${currentTab === 'stats' ? 'active' : ''}">
      <div class="profile-section">
        <div class="section-header">
          <h3>📊 Statistiques détaillées</h3>
        </div>
        <div id="statsDetails">
          ${renderStatsDetails()}
        </div>
      </div>
    </div>
  `;
}

function renderFavoritesList() {
  if (userData.favorites.length === 0) {
    return `<div class="empty-state">❤️ Aucun favori pour le moment</div>`;
  }
  
  return userData.favorites.map(anime => `
    <div class="favorite-item" data-id="${anime.id}">
      <img src="${anime.image || 'https://via.placeholder.com/160x200?text=No+Image'}" alt="${escapeHtml(anime.title)}" loading="lazy" onerror="this.src='https://via.placeholder.com/160x200?text=No+Image'">
      <div class="favorite-info">
        <h4>${escapeHtml(anime.title)}</h4>
        <div class="favorite-score">⭐ ${anime.score || 'N/A'}</div>
        <button class="remove-fav-btn" data-id="${anime.id}">🗑️ Retirer</button>
      </div>
    </div>
  `).join('');
}

function renderHistoryList() {
  if (userData.history.length === 0) {
    return `<div class="empty-state">📜 Aucun historique pour le moment</div>`;
  }
  
  return userData.history.map(item => `
    <div class="history-item" data-id="${item.id}" data-ep="${item.episode}">
      <div class="history-info">
        <div class="history-title">${escapeHtml(item.title)}</div>
        <div class="history-meta">
          📅 ${new Date(item.date).toLocaleDateString('fr-FR')}
          ${item.image ? `<span style="margin-left: 0.5rem;">🎬 Épisode ${item.episode}</span>` : ''}
        </div>
      </div>
      <div class="history-episode">Ép. ${item.episode}</div>
    </div>
  `).join('');
}

function renderStatsDetails() {
  const memberDate = new Date(userData.stats.memberSince).toLocaleDateString('fr-FR');
  const avgEpisodesPerDay = userData.stats.animesWatched > 0 
    ? Math.round(userData.stats.episodesWatched / userData.stats.animesWatched) 
    : 0;
  
  return `
    <div class="stats-details">
      <div class="stat-row">
        <span>📺 Total animes vus</span>
        <span class="stat-value">${userData.stats.animesWatched}</span>
      </div>
      <div class="stat-row">
        <span>❤️ Nombre de favoris</span>
        <span class="stat-value">${userData.favorites.length}</span>
      </div>
      <div class="stat-row">
        <span>🎬 Épisodes regardés</span>
        <span class="stat-value">${userData.stats.episodesWatched}</span>
      </div>
      <div class="stat-row">
        <span>⏱️ Heures visionnées</span>
        <span class="stat-value">${userData.stats.totalHours}</span>
      </div>
      <div class="stat-row">
        <span>📊 Moyenne épisodes/anime</span>
        <span class="stat-value">${avgEpisodesPerDay}</span>
      </div>
      <div class="stat-row">
        <span>📅 Membre depuis</span>
        <span class="stat-value">${memberDate}</span>
      </div>
    </div>
  `;
}

// ============================================
// ÉVÉNEMENTS
// ============================================
function attachEventListeners() {
  // Changement d'onglet
  document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      renderProfileUI();
      attachEventListeners();
    });
  });
  
  // Clic sur les favoris
  document.querySelectorAll('.favorite-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-fav-btn')) return;
      const id = item.dataset.id;
      if (id) window.location.href = `anime-detail.html?id=${id}`;
    });
  });
  
  // Bouton retirer des favoris
  document.querySelectorAll('.remove-fav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const index = userData.favorites.findIndex(fav => fav.id === id);
      if (index !== -1) {
        userData.favorites.splice(index, 1);
        await saveUserDataToFirestore();
        renderProfileUI();
        attachEventListeners();
        showToast('Favori retiré');
      }
    });
  });
  
  // Clic sur l'historique
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.id;
      const ep = item.dataset.ep;
      window.location.href = `watch.html?id=${id}&ep=${ep}`;
    });
  });
  
  // Effacer l'historique
  const clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Voulez-vous vraiment effacer tout votre historique ?')) {
        userData.history = [];
        await saveUserDataToFirestore();
        renderProfileUI();
        attachEventListeners();
        showToast('Historique effacé');
      }
    });
  }
  
  // Actualiser
  const refreshBtn = document.getElementById('refreshDataBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadUserDataFromFirestore();
      renderProfileUI();
      attachEventListeners();
      showToast('Données actualisées');
    });
  }
  
  // Exporter
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportUserData);
  }
}

// ============================================
// EXPORT DONNÉES
// ============================================
function exportUserData() {
  const exportData = {
    user: {
      name: currentUser?.displayName,
      email: currentUser?.email,
      uid: currentUser?.uid
    },
    favorites: userData.favorites,
    history: userData.history,
    stats: userData.stats,
    exportDate: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anime-profile-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Données exportées avec succès');
}

// ============================================
// UTILITAIRES
// ============================================
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Attendre que Firebase soit prêt
  const checkAuth = setInterval(() => {
    if (typeof currentUser !== 'undefined') {
      clearInterval(checkAuth);
      loadProfile();
    }
  }, 100);
});

// Exporter les fonctions pour utilisation globale
window.addToHistory = addToHistory;
window.toggleFavorite = toggleFavorite;
window.isFavorite = isFavorite;
window.updateStats = updateStats;
window.showToast = showToast;

console.log('✅ profile.js chargé');
