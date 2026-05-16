const API_BASE = 'https://api.jikan.moe/v4';
let currentCategory = 'anime';

// Éléments DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const topGrid = document.getElementById('topGrid');
const resultsGrid = document.getElementById('resultsGrid');
const searchResultsSection = document.getElementById('searchResults');
const modal = document.getElementById('modal');
const animeDetails = document.getElementById('animeDetails');
const closeBtn = document.querySelector('.close');

// Charger les top rated selon la catégorie
async function loadTopRated() {
  topGrid.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  
  let url = '';
  if (currentCategory === 'anime') {
    url = `${API_BASE}/top/anime?limit=20`;
  } else if (currentCategory === 'manga') {
    url = `${API_BASE}/top/manga?limit=20`;
  } else if (currentCategory === 'webtoon') {
    // Webtoon - message temporaire en attendant une API dédiée
    topGrid.innerHTML = `
      <div class="error">
        🎨 Webtoon arrive bientôt !<br>
        <small>La section Webtoon sera bientôt disponible avec son propre classement.</small>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      renderGrid(data.data, topGrid);
    } else {
      topGrid.innerHTML = '<div class="error">Aucun résultat trouvé</div>';
    }
  } catch (error) {
    console.error('Erreur:', error);
    topGrid.innerHTML = '<div class="error">❌ Erreur de chargement. Vérifie ta connexion.</div>';
  }
}

// Recherche (anime ou manga selon catégorie)
async function search(query) {
  if (!query.trim()) {
    searchResultsSection.classList.add('hidden');
    return;
  }
  
  resultsGrid.innerHTML = '<div class="loading">⏳ Recherche en cours...</div>';
  searchResultsSection.classList.remove('hidden');
  
  let type = currentCategory === 'anime' ? 'anime' : 'manga';
  
  try {
    const response = await fetch(`${API_BASE}/${type}?q=${encodeURIComponent(query)}&limit=20`);
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      renderGrid(data.data, resultsGrid);
    } else {
      resultsGrid.innerHTML = '<div class="error">Aucun résultat trouvé</div>';
    }
  } catch (error) {
    console.error('Erreur:', error);
    resultsGrid.innerHTML = '<div class="error">❌ Erreur de recherche</div>';
  }
}

// Afficher les détails (anime ou manga)
async function showDetails(id, type) {
  animeDetails.innerHTML = '<div class="loading">⏳ Chargement des détails...</div>';
  modal.classList.remove('hidden');
  
  try {
    const response = await fetch(`${API_BASE}/${type}/${id}`);
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    const item = data.data;
    
    const genres = item.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || '';
    const score = item.score || item.averageScore || 'N/A';
    const episodes = item.episodes || item.chapters || '?';
    const status = item.status || 'Inconnu';
    const imageUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '';
    
    let title = '';
    let synopsis = '';
    
    if (type === 'anime') {
      title = item.title || item.title_english || 'Sans titre';
      synopsis = item.synopsis || 'Pas de synopsis disponible.';
    } else {
      title = item.title || 'Sans titre';
      synopsis = item.synopsis || 'Pas de synopsis disponible.';
    }
    
    animeDetails.innerHTML = `
      <div class="detail-header">
        <img src="${imageUrl}" alt="${title}">
        <div class="detail-info">
          <h2>${title}</h2>
          <p class="meta">
            ⭐ ${score} &nbsp;|&nbsp; 
            📺 ${episodes} ${type === 'anime' ? 'épisodes' : 'chapitres'} &nbsp;|&nbsp;
            ${status}
          </p>
          <div class="genres">${genres}</div>
        </div>
      </div>
      <div class="synopsis">
        <h3>📖 Synopsis</h3>
        <p>${synopsis}</p>
      </div>
    `;
  } catch (error) {
    console.error('Erreur:', error);
    animeDetails.innerHTML = '<div class="error">❌ Impossible de charger les détails</div>';
  }
}

// Rendu de la grille
function renderGrid(items, container) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="error">Aucun élément à afficher</div>';
    return;
  }
  
  container.innerHTML = items.map(item => {
    const id = item.mal_id;
    const title = item.title || item.title_english || 'Sans titre';
    const imageUrl = item.images?.jpg?.image_url || '';
    const score = item.score || item.averageScore || 'N/A';
    const type = currentCategory === 'anime' ? 'anime' : 'manga';
    
    return `
      <div class="card" data-id="${id}" data-type="${type}">
        <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x250?text=Image+non+disponible'">
        <div class="card-info">
          <h3>${title}</h3>
          <p class="score">⭐ ${score}</p>
        </div>
      </div>
    `;
  }).join('');
  
  // Event listeners pour les cartes
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const type = card.dataset.type;
      showDetails(id, type);
    });
  });
}

// Changement de catégorie
function switchCategory(category) {
  currentCategory = category;
  
  // Mettre à jour l'apparence des boutons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    if (btn.dataset.cat === category) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Cacher les résultats de recherche
  searchResultsSection.classList.add('hidden');
  searchInput.value = '';
  
  // Recharger les top rated
  loadTopRated();
}

// Event listeners
searchBtn.addEventListener('click', () => search(searchInput.value));
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') search(searchInput.value);
});

closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// Catégories
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchCategory(btn.dataset.cat);
  });
});

// Initialisation
loadTopRated();
