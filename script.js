// ============================================
// SCRIPT PRINCIPAL - ANIME & MANGA INFO
// Gestion de la recherche, du top rated, du calendrier
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_BASE = 'https://api.jikan.moe/v4';
const CORS_PROXY = 'https://corsproxy.io/?url=';

let currentPage = 1;
let currentGenre = '';
let totalPages = 0;
let isLoading = false;
let searchTimeout = null;

// Corrections des épisodes pour les animes longs
const episodeCorrections = {
  21: 1122,  // One Piece
  1: 220,    // Naruto
  2: 500,    // Naruto Shippuden
  3: 366,    // Bleach
  4: 291,    // Dragon Ball Z
  5: 131,    // Dragon Ball Super
  6: 87,     // Attack on Titan
  7: 47,     // Jujutsu Kaisen
  8: 55,     // Demon Slayer
  9: 138,    // My Hero Academia
  10: 293,   // Boruto
  11: 25,    // Tokyo Revengers
  12: 24,    // Spy x Family
  13: 25,    // Chainsaw Man
  14: 24,    // Blue Lock
  15: 12     // Dragon Ball Daima
};

// ============================================
// FETCH AVEC PROXY CORS
// ============================================
async function fetchWithProxy(url) {
  try {
    const response = await fetch(url);
    if (response.ok) return response;
  } catch (e) {
    console.log('Directe échouée, utilisation du proxy CORS');
  }
  const proxyUrl = CORS_PROXY + encodeURIComponent(url);
  return fetch(proxyUrl);
}

// ============================================
// RECHERCHE EN TEMPS RÉEL (STYLE VOIRANIME)
// ============================================
async function performSearch(query) {
  if (!query.trim()) {
    document.getElementById('searchDropdown')?.classList.remove('active');
    return;
  }

  try {
    const response = await fetchWithProxy(`${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=8`);
    const data = await response.json();
    
    const dropdown = document.getElementById('searchDropdown');
    if (data.data && data.data.length > 0) {
      dropdown.innerHTML = data.data.map(anime => `
        <div class="search-result-item" data-id="${anime.mal_id}">
          <img class="search-result-img" src="${anime.images.jpg.image_url}" alt="${anime.title}" onerror="this.src='https://via.placeholder.com/50x70?text=No+Image'">
          <div class="search-result-info">
            <h4>${anime.title.length > 40 ? anime.title.substring(0,37)+'...' : anime.title}</h4>
            <p>⭐ ${anime.score || 'N/A'} | 📺 ${episodeCorrections[anime.mal_id] || anime.episodes || '?'} épisodes</p>
            <p>${anime.year || 'Date inconnue'} - ${anime.status === 'Currently Airing' ? '🟢 En cours' : (anime.status === 'Finished Airing' ? '✅ Terminé' : '📅 À venir')}</p>
          </div>
        </div>
      `).join('');
      dropdown.classList.add('active');
      
      document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          window.location.href = `anime-detail.html?id=${item.dataset.id}`;
        });
      });
    } else {
      dropdown.innerHTML = '<div class="search-result-item" style="justify-content:center;">Aucun résultat trouvé</div>';
      dropdown.classList.add('active');
    }
  } catch (error) {
    console.error('Erreur recherche:', error);
  }
}

// Recherche complète
async function fullSearch(query) {
  if (!query.trim()) return;
  
  const grid = document.getElementById('animeGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="loading">🔍 Recherche en cours...</div>';
  document.getElementById('searchDropdown')?.classList.remove('active');
  
  try {
    const response = await fetchWithProxy(`${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=30`);
    const data = await response.json();
    
    if (data.data) {
      displayAnimes(data.data);
      document.getElementById('pagination').innerHTML = '';
      const sectionTitle = document.querySelector('#homePage .section-title');
      if (sectionTitle) {
        sectionTitle.innerHTML = `<span>🔍</span> <span>Résultats pour "${escapeHtml(query)}"</span>`;
      }
    } else {
      grid.innerHTML = '<div class="error">❌ Aucun résultat trouvé</div>';
    }
  } catch (error) {
    console.error('Erreur recherche:', error);
    grid.innerHTML = '<div class="error">❌ Erreur de recherche</div>';
  }
}

// ============================================
// CHARGEMENT DES ANIMES
// ============================================
async function loadAnimes(page = 1, genre = '') {
  if (isLoading) return;
  isLoading = true;
  
  const grid = document.getElementById('animeGrid');
  if (!grid) return;
  
  grid.innerHTML = '<div class="loading">⏳ Chargement des animes...</div>';
  
  try {
    let url;
    if (genre) {
      url = `${API_BASE}/anime?genres=${genre}&page=${page}&limit=24&order_by=start_date&sort=desc`;
    } else {
      url = `${API_BASE}/seasons/now?page=${page}&limit=24`;
    }
    
    const response = await fetchWithProxy(url);
    const data = await response.json();
    
    if (data.data) {
      const sortedAnimes = [...data.data].sort((a, b) => {
        const dateA = a.aired?.from ? new Date(a.aired.from) : new Date(0);
        const dateB = b.aired?.from ? new Date(b.aired.from) : new Date(0);
        return dateB - dateA;
      });
      
      totalPages = data.pagination?.last_visible_page || 1;
      displayAnimes(sortedAnimes);
      displayPagination(page, totalPages);
      
      // Restaurer le titre de la section
      const sectionTitle = document.querySelector('#homePage .section-title');
      if (sectionTitle && !sectionTitle.innerHTML.includes('Résultats')) {
        sectionTitle.innerHTML = `<span>📺</span> <span>Dernières sorties</span> <span style="font-size:0.8rem; color:#888;">(classé du plus récent au plus ancien)</span>`;
      }
    }
  } catch (error) {
    console.error('Erreur:', error);
    grid.innerHTML = '<div class="error">❌ Erreur de chargement. Vérifie ta connexion.</div>';
  }
  
  isLoading = false;
}

function displayAnimes(animes) {
  const grid = document.getElementById('animeGrid');
  if (!grid) return;
  
  grid.innerHTML = animes.map(anime => {
    const episodeCount = episodeCorrections[anime.mal_id] || anime.episodes || '?';
    const isAiring = anime.status === 'Currently Airing';
    const releaseDate = anime.aired?.from ? new Date(anime.aired.from).toLocaleDateString('fr-FR') : 'Date inconnue';
    
    return `
      <div class="anime-card" data-id="${anime.mal_id}">
        <span class="badge">${isAiring ? '🟢 En cours' : (anime.status === 'Finished Airing' ? '✅ Terminé' : '📅 Nouveau')}</span>
        <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
        <div class="anime-info">
          <h3>${anime.title.length > 35 ? anime.title.substring(0,32)+'...' : anime.title}</h3>
          <div class="anime-meta">
            <span class="score">⭐ ${anime.score || 'N/A'}</span>
            <span>📺 ${episodeCount} ép</span>
          </div>
          <div class="anime-meta">
            <span>📅 ${releaseDate}</span>
            <span>❤️ ${anime.favorites?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = `anime-detail.html?id=${card.dataset.id}`;
    });
  });
}

function displayPagination(currentPage, total) {
  const paginationDiv = document.getElementById('pagination');
  if (!paginationDiv) return;
  
  let pages = [];
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(total, currentPage + 2); i++) {
    pages.push(i);
  }
  
  paginationDiv.innerHTML = `
    <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>◀ Précédent</button>
    ${pages.map(p => `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`).join('')}
    <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === total ? 'disabled' : ''}>Suivant ▶</button>
  `;
  
  document.querySelectorAll('.page-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.addEventListener('click', () => {
        const newPage = parseInt(btn.dataset.page);
        if (!isNaN(newPage) && newPage !== currentPage) {
          currentPage = newPage;
          loadAnimes(currentPage, currentGenre);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  });
}

// ============================================
// CALENDRIER
// ============================================
async function loadCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;
  
  calendarGrid.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  
  try {
    const response = await fetchWithProxy(`${API_BASE}/schedules`);
    const data = await response.json();
    
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const scheduleByDay = { 'Lundi': [], 'Mardi': [], 'Mercredi': [], 'Jeudi': [], 'Vendredi': [], 'Samedi': [], 'Dimanche': [] };
    
    if (data.data) {
      data.data.forEach(anime => {
        const day = anime.broadcast?.day;
        if (day) {
          const dayFr = {
            'monday': 'Lundi', 'tuesday': 'Mardi', 'wednesday': 'Mercredi',
            'thursday': 'Jeudi', 'friday': 'Vendredi', 'saturday': 'Samedi', 'sunday': 'Dimanche'
          }[day.toLowerCase()];
          if (dayFr && scheduleByDay[dayFr]) {
            scheduleByDay[dayFr].push(anime);
          }
        }
      });
    }
    
    calendarGrid.innerHTML = days.map(day => `
      <div class="calendar-day">
        <h4>${day}</h4>
        ${scheduleByDay[day].slice(0, 10).map(anime => `
          <div class="calendar-episode" data-id="${anime.mal_id}">
            <strong>${anime.title.substring(0, 20)}${anime.title.length > 20 ? '...' : ''}</strong>
            <small>⏰ ${anime.broadcast?.time || '?'}</small>
          </div>
        `).join('')}
        ${scheduleByDay[day].length === 0 ? '<small>Aucune sortie</small>' : ''}
      </div>
    `).join('');
    
    document.querySelectorAll('.calendar-episode').forEach(ep => {
      ep.addEventListener('click', () => {
        window.location.href = `anime-detail.html?id=${ep.dataset.id}`;
      });
    });
    
  } catch (error) {
    console.error('Erreur calendrier:', error);
    calendarGrid.innerHTML = '<div class="error">❌ Erreur de chargement</div>';
  }
}

// ============================================
// TOP RATED
// ============================================
async function loadTopRated() {
  const container = document.getElementById('topGrid');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  
  try {
    const response = await fetchWithProxy(`${API_BASE}/top/anime?limit=30`);
    const data = await response.json();
    
    if (data.data) {
      container.innerHTML = data.data.map(anime => `
        <div class="anime-card" data-id="${anime.mal_id}">
          <span class="badge">🏆 Top ${anime.rank || 'N/A'}</span>
          <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
          <div class="anime-info">
            <h3>${anime.title.length > 35 ? anime.title.substring(0,32)+'...' : anime.title}</h3>
            <div class="anime-meta">
              <span class="score">⭐ ${anime.score || 'N/A'}</span>
              <span>❤️ ${anime.favorites?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>
      `).join('');
      
      document.querySelectorAll('#topGrid .anime-card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `anime-detail.html?id=${card.dataset.id}`;
        });
      });
    }
  } catch (error) {
    console.error('Erreur top:', error);
    container.innerHTML = '<div class="error">❌ Erreur de chargement</div>';
  }
}

// ============================================
// ACTUALITÉS
// ============================================
async function loadNews() {
  const container = document.getElementById('newsGrid');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  
  try {
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.animenewsnetwork.com/news/rss.xml');
    const data = await response.json();
    
    if (data.items) {
      container.innerHTML = data.items.slice(0, 12).map(item => `
        <div class="news-card" onclick="window.open('${item.link}', '_blank')">
          <img src="${item.enclosure?.link || 'https://via.placeholder.com/300x180?text=Anime+News'}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x180?text=News'">
          <div class="news-content">
            <span class="news-source">📰 Anime News Network</span>
            <h3>${item.title.substring(0, 100)}${item.title.length > 100 ? '...' : ''}</h3>
            <p>${(item.description?.replace(/<[^>]*>/g, '') || '').substring(0, 120)}...</p>
            <div class="news-meta">📅 ${new Date(item.pubDate).toLocaleDateString('fr-FR')}</div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Erreur news:', error);
    container.innerHTML = '<div class="error">❌ Erreur de chargement</div>';
  }
}

// ============================================
// NAVIGATION
// ============================================
function switchPage(page) {
  const pages = ['homePage', 'calendarPage', 'topPage', 'newsPage'];
  pages.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.classList.add('hidden');
  });
  
  const activePage = document.getElementById(page);
  if (activePage) activePage.classList.remove('hidden');
  
  if (page === 'calendarPage') loadCalendar();
  else if (page === 'topPage') loadTopRated();
  else if (page === 'newsPage') loadNews();
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
  // Charger les animes
  if (document.getElementById('animeGrid')) {
    loadAnimes(1, '');
  }
  
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchPage(btn.dataset.page + 'Page');
    });
  });
  
  // Filtres genres
  document.querySelectorAll('.genre-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.genre-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGenre = btn.dataset.genre;
      currentPage = 1;
      loadAnimes(currentPage, currentGenre);
    });
  });
  
  // Recherche
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') fullSearch(searchInput.value);
    });
  }
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => fullSearch(searchInput?.value || ''));
  }
  
  // Fermer le dropdown en cliquant ailleurs
  document.addEventListener('click', (e) => {
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer && !searchContainer.contains(e.target)) {
      document.getElementById('searchDropdown')?.classList.remove('active');
    }
  });
});

// Exporter les fonctions globales
window.loadAnimes = loadAnimes;
window.loadCalendar = loadCalendar;
window.loadTopRated = loadTopRated;
window.loadNews = loadNews;
window.fullSearch = fullSearch;
window.showToast = showToast;

console.log('✅ script.js chargé');
