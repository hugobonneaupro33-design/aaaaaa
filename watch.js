// ============================================
// WATCH.JS - LECTEUR VIDÉO ANIME & MANGA INFO
// Version autonome et optimisée
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
let currentEpisode = parseInt(urlParams.get('ep')) || 1;
let currentLang = 'vf';
let currentSource = 'voe';
let episodeCount = 0;
let animeTitle = '';
let episodesList = [];
let autoPlayNext = true;
let nextAiringEpisode = null;
let currentZoom = 1;

const ANILIST_API = 'https://graphql.anilist.co';
const PROXY = 'https://corsproxy.io/?url=';

// ============================================
// 10 SOURCES DE LECTEUR
// ============================================
const embedSources = {
  voe: { name: 'Voe', vf: (id,ep) => `https://voe.sx/e/${id}-${ep}`, vostfr: (id,ep) => `https://voe.sx/e/${id}-${ep}`, isAvailable: true },
  send: { name: 'Send.cm', vf: (id,ep) => `https://send.cm/embed/${id}-${ep}`, vostfr: (id,ep) => `https://send.cm/embed/${id}-${ep}`, isAvailable: true },
  kraken: { name: 'Kraken', vf: (id,ep) => `https://krakenfiles.com/embed/${id}-${ep}`, vostfr: (id,ep) => `https://krakenfiles.com/embed/${id}-${ep}`, isAvailable: true },
  animesama: { name: 'AnimeSama', vf: (id,ep) => `https://animesama.cc/embed/${id}-${ep}`, vostfr: (id,ep) => `https://animesama.cc/embed/${id}-${ep}`, isAvailable: true },
  gdrive: { name: 'GDrive', vf: (id,ep) => `https://drive.google.com/file/d/preview`, vostfr: (id,ep) => `https://drive.google.com/file/d/preview`, isAvailable: true },
  uqload: { name: 'Uqload', vf: (id,ep) => `https://uqload.com/embed-${id}-${ep}.html`, vostfr: (id,ep) => `https://uqload.com/embed-${id}-${ep}.html`, isAvailable: true },
  streamsb: { name: 'StreamSB', vf: (id,ep) => `https://streamsb.net/embed-${id}-${ep}`, vostfr: (id,ep) => `https://streamsb.net/embed-${id}-${ep}`, isAvailable: true },
  mp4upload: { name: 'Mp4Upload', vf: (id,ep) => `https://www.mp4upload.com/embed-${id}-${ep}.html`, vostfr: (id,ep) => `https://www.mp4upload.com/embed-${id}-${ep}.html`, isAvailable: true },
  doodstream: { name: 'Doodstream', vf: (id,ep) => `https://doodstream.com/e/${id}-${ep}`, vostfr: (id,ep) => `https://doodstream.com/e/${id}-${ep}`, isAvailable: true },
  mixdrop: { name: 'Mixdrop', vf: (id,ep) => `https://mixdrop.co/e/${id}-${ep}`, vostfr: (id,ep) => `https://mixdrop.co/e/${id}-${ep}`, isAvailable: true }
};

// Corrections pour les animes très longs
const LONG_ANIMES = {
  21: 1162, 1: 1124, 2: 500, 3: 366, 4: 291, 5: 131,
  6: 87, 7: 47, 8: 55, 9: 138, 10: 293, 154587: 28
};

// ============================================
// REQUÊTE ANILIST
// ============================================
const ANIME_QUERY = `query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id title { romaji english } coverImage { large } episodes status averageScore nextAiringEpisode { episode airingAt }
  }
}`;

async function fetchAnime(id) {
  try {
    const response = await fetch(PROXY + encodeURIComponent(ANILIST_API), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: ANIME_QUERY, variables: { id } })
    });
    const data = await response.json();
    return data.data?.Media;
  } catch (error) { console.error('Erreur:', error); return null; }
}

// ============================================
// CHARGEMENT DE L'ANIME
// ============================================
async function loadAnime() {
  if (!animeId) {
    document.getElementById('animeTitle').textContent = 'ID manquant';
    showToast('ID d\'anime manquant', 'error');
    return;
  }

  try {
    const anime = await fetchAnime(parseInt(animeId));
    if (!anime) throw new Error('Anime non trouvé');
    
    animeTitle = anime.title?.romaji || anime.title?.english || 'Anime';
    episodeCount = LONG_ANIMES[animeId] || anime.episodes || 24;
    nextAiringEpisode = anime.nextAiringEpisode;
    
    document.getElementById('animeTitle').textContent = animeTitle;
    document.getElementById('currentAnimeTitle').textContent = animeTitle;
    
    const isAiring = anime.status === 'RELEASING';
    let nextEpText = '';
    if (isAiring && nextAiringEpisode) {
      const nextDate = new Date(nextAiringEpisode.airingAt * 1000);
      nextEpText = ` | 📺 Prochain: Ép. ${nextAiringEpisode.episode} le ${nextDate.toLocaleDateString('fr-FR')}`;
    }
    
    document.getElementById('animeMeta').innerHTML = `
      <span>⭐ ${(anime.averageScore / 10).toFixed(1) || 'N/A'}</span>
      <span>📺 ${episodeCount} épisodes</span>
      <span>${isAiring ? '🟢 En cours' : (anime.status === 'FINISHED' ? '✅ Terminé' : '📅 À venir')}${nextEpText}</span>
    `;
    
    generateEpisodesList();
    await restoreProgress();
    loadEpisode(currentEpisode);
    
  } catch (error) {
    console.error('Erreur:', error);
    document.getElementById('animeTitle').textContent = 'Erreur de chargement';
    showToast('Erreur de chargement de l\'anime', 'error');
  }
}

function generateEpisodesList() {
  const maxEpisodes = Math.min(episodeCount, 2000);
  episodesList = Array.from({ length: maxEpisodes }, (_, i) => {
    const epNum = i + 1;
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() - (episodeCount - epNum));
    return { number: epNum, title: `Épisode ${epNum}`, date: releaseDate.toLocaleDateString('fr-FR') };
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
      <div class="episode-date">📅 ${ep.date}</div>
      <button class="watch-btn" data-ep="${ep.number}">▶</button>
    </div>
  `).join('');
  attachEpisodeEvents();
}

function attachEpisodeEvents() {
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
  
  const embedUrl = embedSources[currentSource][currentLang](animeId, episode);
  if (videoFrame) {
    videoFrame.src = embedUrl;
    videoFrame.onload = () => { if (loadingDiv) loadingDiv.style.display = 'none'; };
    videoFrame.onerror = () => {
      if (loadingDiv) loadingDiv.style.display = 'none';
      showToast(`Erreur de chargement (source: ${embedSources[currentSource].name})`, 'error');
    };
  }
  setTimeout(() => { if (loadingDiv) loadingDiv.style.display = 'none'; }, 5000);
  
  document.getElementById('currentEpisodeDisplay').textContent = `Épisode ${episode}`;
  window.history.pushState({}, '', `${window.location.pathname}?id=${animeId}&ep=${episode}`);
  
  document.querySelectorAll('.episode-card').forEach(card => {
    card.classList.remove('active');
    if (parseInt(card.dataset.ep) === episode) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
  
  document.getElementById('progressInfo').innerHTML = `📊 Progression: Épisode ${episode}/${episodeCount}`;
  saveProgress(episode);
}

function saveProgress(episode) {
  localStorage.setItem(`progress_${animeId}`, episode);
}

async function restoreProgress() {
  const savedEpisode = localStorage.getItem(`progress_${animeId}`);
  if (savedEpisode && parseInt(savedEpisode) !== currentEpisode) {
    if (confirm(`📌 Reprendre à l'épisode ${savedEpisode} ?`)) currentEpisode = parseInt(savedEpisode);
  }
}

function nextEpisode() {
  if (currentEpisode < episodeCount) loadEpisode(currentEpisode + 1);
  else showToast('🎉 C\'est le dernier épisode', 'info');
}

function prevEpisode() {
  if (currentEpisode > 1) loadEpisode(currentEpisode - 1);
  else showToast('📺 C\'est le premier épisode', 'info');
}

// ============================================
// ZOOM
// ============================================
function updateZoom(change) {
  currentZoom = Math.min(2, Math.max(0.5, currentZoom + change));
  const player = document.getElementById('videoPlayer');
  if (player) player.style.transform = `scale(${currentZoom})`;
  const zoomLevel = document.getElementById('zoomLevel');
  if (zoomLevel) zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  localStorage.setItem('zoomLevel', currentZoom);
}

function resetZoom() {
  currentZoom = 1;
  const player = document.getElementById('videoPlayer');
  if (player) player.style.transform = 'scale(1)';
  const zoomLevel = document.getElementById('zoomLevel');
  if (zoomLevel) zoomLevel.textContent = '100%';
  localStorage.setItem('zoomLevel', 1);
}

// ============================================
// THEME SOMBRE/CLAIR
// ============================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') document.body.classList.add('light-theme');
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = savedTheme === 'light' ? '☀️' : '🌙';
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.textContent = isLight ? '☀️' : '🌙';
}

// ============================================
// GÉNÉRATION DES SOURCES
// ============================================
function generateSourceButtons() {
  const container = document.getElementById('sourceSelector');
  if (!container) return;
  container.innerHTML = '';
  for (const [key, source] of Object.entries(embedSources)) {
    const btn = document.createElement('button');
    btn.className = `source-btn ${key === currentSource ? 'active' : ''}`;
    btn.dataset.source = key;
    btn.textContent = source.name;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSource = key;
      loadEpisode(currentEpisode);
      showToast(`Source: ${source.name}`, 'info');
    });
    container.appendChild(btn);
  }
}

// ============================================
// RACCOURCIS CLAVIER
// ============================================
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    switch(e.key) {
      case 'ArrowLeft': prevEpisode(); break;
      case 'ArrowRight': nextEpisode(); break;
      case 'f': case 'F': document.querySelector('.video-player')?.requestFullscreen(); break;
      case '+': updateZoom(0.1); break;
      case '-': updateZoom(-0.1); break;
      case '0': resetZoom(); break;
      case 'z': case 'Z': resetZoom(); break;
    }
  });
}

// ============================================
// ÉVÉNEMENTS UI
// ============================================
function setupEventListeners() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      loadEpisode(currentEpisode);
      showToast(`Langue: ${currentLang === 'vf' ? 'VF' : 'VOSTFR'}`, 'info');
    });
  });
  
  document.getElementById('prevEpisodeBtn')?.addEventListener('click', prevEpisode);
  document.getElementById('nextEpisodeBtn')?.addEventListener('click', nextEpisode);
  
  const autoPlayCheckbox = document.getElementById('autoPlayNext');
  if (autoPlayCheckbox) {
    autoPlayCheckbox.addEventListener('change', (e) => {
      autoPlayNext = e.target.checked;
      localStorage.setItem('autoPlayNext', autoPlayNext);
    });
  }
  
  document.getElementById('episodeSearch')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('.episode-card').forEach(card => {
      card.style.display = card.dataset.ep.includes(term) ? 'flex' : 'none';
    });
  });
  
  document.getElementById('zoomInBtn')?.addEventListener('click', () => updateZoom(0.1));
  document.getElementById('zoomOutBtn')?.addEventListener('click', () => updateZoom(-0.1));
  document.getElementById('zoomResetBtn')?.addEventListener('click', resetZoom);
  document.getElementById('zoomInMini')?.addEventListener('click', () => updateZoom(0.1));
  document.getElementById('zoomOutMini')?.addEventListener('click', () => updateZoom(-0.1));
  document.getElementById('zoomResetMini')?.addEventListener('click', resetZoom);
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  generateSourceButtons();
  loadAnime();
  setupEventListeners();
  setupKeyboardShortcuts();
  const savedZoom = localStorage.getItem('zoomLevel');
  if (savedZoom) {
    currentZoom = parseFloat(savedZoom);
    const player = document.getElementById('videoPlayer');
    if (player) player.style.transform = `scale(${currentZoom})`;
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }
});

console.log('✅ watch.js chargé (10 sources, mode sombre, zoom)');
