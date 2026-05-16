// Configuration API
const API_BASE = 'https://api.jikan.moe/v4';

// Variables globales
let currentUser = null;
let currentPage = 'home';

// ============================================
// CHARGEMENT DES DONNÉES RÉELLES
// ============================================

// Récupérer les animes de la saison actuelle
async function loadSeasonalAnime() {
  try {
    const response = await fetch(`${API_BASE}/seasons/now?limit=12`);
    const data = await response.json();
    const container = document.getElementById('seasonalAnime');
    
    if (container && data.data) {
      container.innerHTML = data.data.map(anime => `
        <div class="card" data-id="${anime.mal_id}" data-type="anime">
          <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
          <div class="card-info">
            <h3>${anime.title}</h3>
            <div class="score">⭐ ${anime.score || 'N/A'}</div>
          </div>
        </div>
      `).join('');
      
      // Ajouter les événements de clic
      document.querySelectorAll('#seasonalAnime .card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.id;
          window.location.href = `anime-detail.html?id=${id}`;
        });
      });
    }
    
    // Afficher la saison actuelle
    const seasonEl = document.getElementById('currentSeason');
    if (seasonEl) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      let season = 'HIVER';
      if (month >= 2 && month <= 4) season = 'PRINTEMPS';
      else if (month >= 5 && month <= 7) season = 'ÉTÉ';
      else if (month >= 8 && month <= 10) season = 'AUTOMNE';
      seasonEl.textContent = `🍂 ${season} ${year}`;
    }
  } catch (error) {
    console.error('Erreur chargement saison:', error);
  }
}

// Récupérer les tendances de la semaine
async function loadTrending() {
  try {
    const response = await fetch(`${API_BASE}/top/anime?filter=airing&limit=24`);
    const data = await response.json();
    const container = document.getElementById('trendingGrid');
    
    if (container && data.data) {
      container.innerHTML = data.data.map(anime => `
        <div class="card" data-id="${anime.mal_id}" data-type="anime">
          <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
          <div class="card-info">
            <h3>${anime.title}</h3>
            <div class="score">⭐ ${anime.score || 'N/A'}</div>
          </div>
        </div>
      `).join('');
      
      document.querySelectorAll('#trendingGrid .card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `anime-detail.html?id=${card.dataset.id}`;
        });
      });
    }
  } catch (error) {
    console.error('Erreur chargement tendances:', error);
  }
}

// Récupérer les sorties du jour (basé sur le planning)
async function loadTodayReleases() {
  try {
    // Récupérer le planning de la semaine
    const response = await fetch(`${API_BASE}/schedules`);
    const data = await response.json();
    const today = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = days[today];
    
    const container = document.getElementById('todayReleases');
    if (container && data.data) {
      const todayReleases = data.data.filter(anime => {
        const airingDay = anime.broadcast?.day?.toLowerCase();
        return airingDay === todayName;
      }).slice(0, 12);
      
      if (todayReleases.length > 0) {
        container.innerHTML = todayReleases.map(anime => `
          <div class="release-card" data-id="${anime.mal_id}">
            <img src="${anime.images.jpg.image_url}" alt="${anime.title}">
            <div class="release-info">
              <h4>${anime.title}</h4>
              <p>Épisode ${anime.episodes || '?'}</p>
              <p>⏰ ${anime.broadcast?.time || 'Horaire inconnu'}</p>
            </div>
          </div>
        `).join('');
        
        document.querySelectorAll('.release-card').forEach(card => {
          card.addEventListener('click', () => {
            window.location.href = `watch.html?id=${card.dataset.id}`;
          });
        });
      } else {
        container.innerHTML = '<p class="info">Aucune sortie prévue aujourd\'hui</p>';
      }
    }
  } catch (error) {
    console.error('Erreur chargement sorties:', error);
    document.getElementById('todayReleases').innerHTML = '<p class="error">Impossible de charger les sorties</p>';
  }
}

// Récupérer le Top Rated
async function loadTopRated(category = 'anime') {
  const container = document.getElementById('topGrid');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">Chargement...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/top/${category}?limit=24`);
    const data = await response.json();
    
    if (data.data) {
      container.innerHTML = data.data.map(item => `
        <div class="card" data-id="${item.mal_id}" data-type="${category}">
          <img src="${item.images.jpg.image_url}" alt="${item.title}" loading="lazy">
          <div class="card-info">
            <h3>${item.title}</h3>
            <div class="score">⭐ ${item.score || 'N/A'}</div>
            <div class="rank">#${item.rank || 'N/A'}</div>
          </div>
        </div>
      `).join('');
      
      document.querySelectorAll('#topGrid .card').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.type;
          const id = card.dataset.id;
          window.location.href = `${type}-detail.html?id=${id}`;
        });
      });
    }
  } catch (error) {
    console.error('Erreur chargement top:', error);
    container.innerHTML = '<div class="error">Erreur de chargement</div>';
  }
}

// Récupérer les actualités (via RSS to JSON)
async function loadNews() {
  const container = document.getElementById('newsGrid');
  if (!container) return;
  
  container.innerHTML = '<div class="loading">Chargement des actualités...</div>';
  
  // Nouvelles sources d'API gratuites
  const newsSources = [
    { name: 'Anime News Network', url: 'https://www.animenewsnetwork.com/news/rss.xml' },
    { name: 'Crunchyroll', url: 'https://www.crunchyroll.com/news/rss' }
  ];
  
  try {
    // Utiliser l'API rss2json gratuite
    const response = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.animenewsnetwork.com/news/rss.xml');
    const data = await response.json();
    
    if (data.items) {
      container.innerHTML = data.items.slice(0, 12).map(item => `
        <div class="news-card" onclick="window.open('${item.link}', '_blank')">
          <img src="${item.enclosure?.link || 'https://via.placeholder.com/300x180?text=News'}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/300x180?text=Anime+News'">
          <div class="news-content">
            <span class="news-source">📰 Anime News Network</span>
            <h3>${item.title.substring(0, 100)}${item.title.length > 100 ? '...' : ''}</h3>
            <p>${item.description?.replace(/<[^>]*>/g, '').substring(0, 120)}...</p>
            <div class="news-meta">
              <span>📅 ${new Date(item.pubDate).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<p class="info">Actualités temporairement indisponibles</p>';
    }
  } catch (error) {
    console.error('Erreur chargement news:', error);
    container.innerHTML = '<p class="error">Impossible de charger les actualités</p>';
  }
}

// Calendrier des sorties (planning hebdomadaire réel)
async function loadCalendar() {
  try {
    const response = await fetch(`${API_BASE}/schedules`);
    const data = await response.json();
    const calendarGrid = document.getElementById('calendarGrid');
    
    if (!calendarGrid) return;
    
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const scheduleByDay = {};
    
    // Organiser les animes par jour
    days.forEach(day => scheduleByDay[day] = []);
    
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
        <div class="calendar-episodes">
          ${scheduleByDay[day].slice(0, 8).map(anime => `
            <div class="calendar-episode" data-id="${anime.mal_id}">
              <strong>${anime.title.substring(0, 25)}</strong>
              <small>${anime.broadcast?.time || 'Horaire inconnu'}</small>
            </div>
          `).join('')}
          ${scheduleByDay[day].length === 0 ? '<small>Aucune sortie</small>' : ''}
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.calendar-episode').forEach(ep => {
      ep.addEventListener('click', () => {
        window.location.href = `anime-detail.html?id=${ep.dataset.id}`;
      });
    });
    
  } catch (error) {
    console.error('Erreur chargement calendrier:', error);
  }
}

// Recherche
async function search(query) {
  if (!query.trim()) return;
  
  const resultsGrid = document.getElementById('resultsGrid');
  const searchSection = document.getElementById('searchResults');
  
  if (!resultsGrid) return;
  
  searchSection.classList.remove('hidden');
  resultsGrid.innerHTML = '<div class="loading">Recherche...</div>';
  
  try {
    const response = await fetch(`${API_BASE}/anime?q=${encodeURIComponent(query)}&limit=24`);
    const data = await response.json();
    
    if (data.data) {
      resultsGrid.innerHTML = data.data.map(anime => `
        <div class="card" data-id="${anime.mal_id}">
          <img src="${anime.images.jpg.image_url}" alt="${anime.title}">
          <div class="card-info">
            <h3>${anime.title}</h3>
            <div class="score">⭐ ${anime.score || 'N/A'}</div>
          </div>
        </div>
      `).join('');
      
      document.querySelectorAll('#resultsGrid .card').forEach(card => {
        card.addEventListener('click', () => {
          window.location.href = `anime-detail.html?id=${card.dataset.id}`;
        });
      });
    }
  } catch (error) {
    console.error('Erreur recherche:', error);
    resultsGrid.innerHTML = '<div class="error">Erreur de recherche</div>';
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
  
  // Charger les données selon la page
  if (page === 'homePage') {
    loadTrending();
    loadTodayReleases();
  } else if (page === 'calendarPage') {
    loadCalendar();
  } else if (page === 'topPage') {
    loadTopRated('anime');
  } else if (page === 'newsPage') {
    loadNews();
  }
  
  currentPage = page;
}

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Charger les données
  loadSeasonalAnime();
  loadTrending();
  loadTodayReleases();
  loadNews();
  
  // Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      switchPage(btn.dataset.page + 'Page');
    });
  });
  
  // Catégories Top Rated
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTopRated(btn.dataset.cat);
    });
  });
  
  // Recherche
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => search(searchInput.value));
  }
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') search(searchInput.value);
    });
  }
  
  // Navigation calendrier
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const currentWeekBtn = document.getElementById('currentWeekBtn');
  
  if (currentWeekBtn) {
    currentWeekBtn.addEventListener('click', () => loadCalendar());
  }
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => console.log('Semaine précédente'));
  }
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => console.log('Semaine suivante'));
  }
});

// ============================================
// AUTHENTIFICATION
// ============================================

if (typeof auth !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    const authDiv = document.getElementById('authButtons');
    const userDiv = document.getElementById('userMenu');
    
    if (authDiv && userDiv) {
      if (user) {
        authDiv.style.display = 'none';
        userDiv.style.display = 'flex';
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        if (userName) userName.textContent = user.displayName || user.email;
        if (userAvatar && user.photoURL) userAvatar.src = user.photoURL;
      } else {
        authDiv.style.display = 'flex';
        userDiv.style.display = 'none';
      }
    }
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }
}

// Exporter les fonctions globales
window.loginWithGoogle = () => auth?.signInWithPopup(new firebase.auth.GoogleAuthProvider());
window.loginWithFacebook = () => auth?.signInWithPopup(new firebase.auth.FacebookAuthProvider());
window.logout = () => auth?.signOut();
