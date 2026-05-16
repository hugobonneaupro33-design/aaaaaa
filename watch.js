// ============================================
// WATCH.JS - LECTEUR VIDÉO ANIME & MANGA INFO
// Version corrigée avec AniList API
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const ANILIST_API = 'https://graphql.anilist.co';

// Récupération des paramètres URL
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
const mangaId = urlParams.get('manga');
const webtoonId = urlParams.get('webtoon');
const contentType = animeId ? 'anime' : (mangaId ? 'manga' : (webtoonId ? 'webtoon' : null));
const contentId = animeId || mangaId || webtoonId;

let currentEpisode = parseInt(urlParams.get('ep')) || 1;
let currentLang = 'vf';
let currentSource = 'voe';
let currentSpeed = 1;
let episodeCount = 0;
let contentTitle = '';
let episodesList = [];
let contentData = null;
let autoPlayNext = true;

// Corrections des épisodes pour les animes longs
const episodeCorrections = {
  21: 1122,  // One Piece
  1: 1100,   // Detective Conan
  2: 500,    // Naruto Shippuden
  3: 366,    // Bleach
  4: 291,    // Dragon Ball Z
  5: 131,    // Dragon Ball Super
  6: 87,     // Attack on Titan
  7: 47,     // Jujutsu Kaisen
  8: 55,     // Demon Slayer
  9: 138,    // My Hero Academia
  10: 293    // Boruto
};

// Sources d'embed disponibles
const embedSources = {
  voe: {
    name: 'Voe',
    vf: (id, ep) => `https://voe.sx/e/${id}-${ep}`,
    vostfr: (id, ep) => `https://voe.sx/e/${id}-${ep}`,
    isAvailable: true
  },
  send: {
    name: 'Send.cm',
    vf: (id, ep) => `https://send.cm/embed/${id}-${ep}`,
    vostfr: (id, ep) => `https://send.cm/embed/${id}-${ep}`,
    isAvailable: true
  },
  gdrive: {
    name: 'Google Drive',
    vf: (id, ep) => `https://drive.google.com/file/d/preview`,
    vostfr: (id, ep) => `https://drive.google.com/file/d/preview`,
    isAvailable: true
  },
  animesama: {
    name: 'AnimeSama',
    vf: (id, ep) => `https://animesama.cc/embed/${id}-${ep}`,
    vostfr: (id, ep) => `https://animesama.cc/embed/${id}-${ep}`,
    isAvailable: true
  }
};

// ============================================
// REQUÊTE ANILIST
// ============================================
const ANIME_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      title { romaji english }
      coverImage { large }
      episodes
      status
      averageScore
      nextAiringEpisode { episode airingAt }
    }
  }
`;

async function fetchAnilist(query, variables) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      return null;
    }
    return data.data;
  } catch (error) {
    console.error('Erreur fetch AniList:', error);
    return null;
  }
}

// ============================================
// CHARGEMENT DE L'ANIME
// ============================================
async function loadContent() {
  if (!contentId || !contentType) {
    document.getElementById('animeTitle').textContent = 'ID manquant';
    showToast('ID du contenu manquant', 'error');
    return;
  }

  try {
    const data = await fetchAnilist(ANIME_QUERY, { id: parseInt(contentId) });
    if (!data || !data.Media) throw new Error('Anime non trouvé');
    
    contentData = data.Media;
    contentTitle = contentData.title?.romaji || contentData.title?.english || 'Anime';
    
    // Déterminer le nombre d'épisodes
    if (episodeCorrections[contentId]) {
      episodeCount = episodeCorrections[contentId];
    } else if (contentData.episodes) {
      episodeCount = contentData.episodes;
    } else if (contentData.nextAiringEpisode) {
      episodeCount = contentData.nextAiringEpisode.episode - 1;
    } else {
      episodeCount = 24;
    }
    
    document.getElementById('animeTitle').textContent = contentTitle;
    document.getElementById('currentAnimeTitle').textContent = contentTitle;
    
    const isAiring = contentData.status === 'RELEASING';
    document.getElementById('animeMeta').innerHTML = `
      <span>⭐ ${(contentData.averageScore / 10).toFixed(1) || 'N/A'}</span>
      <span>📺 ${episodeCount} épisodes</span>
      <span>${isAiring ? '🟢 En cours' : (contentData.status === 'FINISHED' ? '✅ Terminé' : '📅 À venir')}</span>
    `;
    
    generateEpisodesList();
    loadEpisode(currentEpisode);
    
    // Restaurer la progression
    restoreProgress();
    
  } catch (error) {
    console.error('Erreur:', error);
    document.getElementById('animeTitle').textContent = 'Erreur de chargement';
    showToast('Erreur de chargement du contenu', 'error');
  }
}

function generateEpisodesList() {
  episodesList = Array.from({ length: Math.min(episodeCount, 500) }, (_, i) => {
    const epNum = i + 1;
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() - (episodeCount - epNum));
    return {
      number: epNum,
      title: `Épisode ${epNum}`,
      releaseDate: releaseDate,
      thumbnail: contentData?.coverImage?.large || null
    };
  });
  
  displayEpisodesList();
}

function displayEpisodesList() {
  const container = document.getElementById('episodesList');
  if (!container) return;

  container.innerHTML = episodesList.map(ep => `
    <div class="episode-card ${ep.number === currentEpisode ? 'active' : ''}" data-ep="${ep.number}">
      <div class="episode-number">Ép. ${ep.number}</div>
      <div class="episode-title">${ep.title}</div>
      <div class="episode-date">📅 ${ep.releaseDate.toLocaleDateString('fr-FR')}</div>
      <button class="watch-btn" data-ep="${ep.number}">▶</button>
    </div>
  `).join('');

  document.querySelectorAll('.episode-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('watch-btn')) return;
      const epNum = parseInt(card.dataset.ep);
      if (!isNaN(epNum)) loadEpisode(epNum);
    });
  });

  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const epNum = parseInt(btn.dataset.ep);
      if (!isNaN(epNum)) loadEpisode(epNum);
    });
  });
}

// ============================================
// LECTEUR VIDÉO
// ============================================
function loadEpisode(episode) {
  currentEpisode = episode;
  const videoFrame = document.getElementById('videoFrame');
  const loadingDiv = document.getElementById('videoLoading');
  
  if (loadingDiv) loadingDiv.style.display = 'flex';
  
  // Vérifier si la source est disponible
  const source = embedSources[currentSource];
  if (!source || !source.isAvailable) {
    showToast(`Source ${currentSource} non disponible, bascule vers Voe`, 'warning');
    currentSource = 'voe';
  }
  
  const embedUrl = embedSources[currentSource][currentLang](contentId, episode);
  
  if (videoFrame) {
    videoFrame.src = embedUrl;
    videoFrame.onload = () => {
      if (loadingDiv) loadingDiv.style.display = 'none';
    };
    videoFrame.onerror = () => {
      if (loadingDiv) loadingDiv.style.display = 'none';
      showToast(`Erreur de chargement de la vidéo (source: ${currentSource})`, 'error');
    };
  }
  
  setTimeout(() => {
    if (loadingDiv) loadingDiv.style.display = 'none';
  }, 5000);
  
  // Mettre à jour l'affichage
  document.getElementById('currentEpisodeDisplay').textContent = `Épisode ${episode}`;
  
  // Mettre à jour l'URL sans recharger
  const newUrl = `${window.location.pathname}?id=${contentId}&ep=${episode}`;
  window.history.pushState({}, '', newUrl);
  
  // Mettre à jour l'épisode actif dans la liste
  document.querySelectorAll('.episode-card').forEach(card => {
    card.classList.remove('active');
    if (parseInt(card.dataset.ep) === episode) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  
  // Sauvegarder la progression
  saveProgress(episode);
}

// ============================================
// PROGRESSION ET SAUVEGARDE
// ============================================
function saveProgress(episode) {
  // Sauvegarde locale
  localStorage.setItem(`progress_${contentType}_${contentId}`, episode);
  localStorage.setItem(`lastWatched_${contentType}_${contentId}`, new Date().toISOString());
  
  // Sauvegarde Firestore si disponible
  if (typeof saveProgressToFirestore !== 'undefined' && window.db) {
    saveProgressToFirestore(contentType, contentId, episode);
  }
  
  console.log(`✅ Progression sauvegardée: Épisode ${episode}/${episodeCount}`);
}

function restoreProgress() {
  const savedEpisode = localStorage.getItem(`progress_${contentType}_${contentId}`);
  if (savedEpisode && parseInt(savedEpisode) !== currentEpisode) {
    const restore = confirm(`📌 Vous vous êtes arrêté à l'épisode ${savedEpisode}. Voulez-vous reprendre ?`);
    if (restore) {
      currentEpisode = parseInt(savedEpisode);
      loadEpisode(currentEpisode);
    }
  }
}

// ============================================
// NAVIGATION ÉPISODES
// ============================================
function nextEpisode() {
  if (currentEpisode < episodesList.length) {
    loadEpisode(currentEpisode + 1);
  } else {
    showToast('🎉 C\'est le dernier épisode disponible', 'info');
  }
}

function prevEpisode() {
  if (currentEpisode > 1) {
    loadEpisode(currentEpisode - 1);
  } else {
    showToast('📺 C\'est le premier épisode', 'info');
  }
}

// ============================================
// RACCOURCIS CLAVIER
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
      case 'ArrowLeft':
        prevEpisode();
        break;
      case 'ArrowRight':
        nextEpisode();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        break;
      case ' ':
      case 'Space':
        e.preventDefault();
        togglePlayPause();
        break;
    }
  });
}

function toggleFullscreen() {
  const videoPlayer = document.querySelector('.video-player-wrapper');
  if (videoPlayer) {
    if (!document.fullscreenElement) {
      videoPlayer.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }
}

function togglePlayPause() {
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame && videoFrame.contentWindow) {
    try {
      videoFrame.contentWindow.postMessage({ type: 'playpause' }, '*');
    } catch(e) {}
  }
}

// ============================================
// ÉVÉNEMENTS UI
// ============================================
function setupEventListeners() {
  // Changement de langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      loadEpisode(currentEpisode);
      showToast(`Langue: ${currentLang === 'vf' ? 'VF' : 'VOSTFR'}`, 'info');
    });
  });
  
  // Changement de source
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSource = btn.dataset.source;
      loadEpisode(currentEpisode);
      showToast(`Source: ${embedSources[currentSource]?.name || currentSource}`, 'info');
    });
  });
  
  // Changement de vitesse
  document.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpeed = parseFloat(btn.dataset.speed);
      showToast(`Vitesse: ${currentSpeed}x`, 'info');
    });
  });
  
  // Navigation épisodes
  document.getElementById('prevEpisodeBtn')?.addEventListener('click', prevEpisode);
  document.getElementById('nextEpisodeBtn')?.addEventListener('click', nextEpisode);
  
  // Recherche d'épisodes
  document.getElementById('episodeSearch')?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    document.querySelectorAll('.episode-card').forEach(card => {
      const epNum = card.dataset.ep;
      if (epNum.includes(searchTerm)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
  
  // Autoplay suivant
  const autoPlayCheckbox = document.getElementById('autoPlayNext');
  if (autoPlayCheckbox) {
    autoPlayCheckbox.addEventListener('change', (e) => {
      autoPlayNext = e.target.checked;
      localStorage.setItem('autoPlayNext', autoPlayNext);
    });
  }
  
  // Restaurer préférence autoplay
  const savedAutoPlay = localStorage.getItem('autoPlayNext');
  if (savedAutoPlay !== null) {
    autoPlayNext = savedAutoPlay === 'true';
    if (autoPlayCheckbox) autoPlayCheckbox.checked = autoPlayNext;
  }
}

// ============================================
// UTILITAIRES
// ============================================
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
  loadContent();
  setupEventListeners();
  setupKeyboardShortcuts();
});

// Exporter les fonctions pour utilisation externe
window.loadEpisode = loadEpisode;
window.nextEpisode = nextEpisode;
window.prevEpisode = prevEpisode;
window.showToast = showToast;

console.log('✅ watch.js chargé (version AniList)');
