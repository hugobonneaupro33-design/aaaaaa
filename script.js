const API_BASE = '[anipub.xyz](https://anipub.xyz/api)';

// Éléments DOM
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const topGrid = document.getElementById('topGrid');
const resultsGrid = document.getElementById('resultsGrid');
const searchResultsSection = document.getElementById('searchResults');
const modal = document.getElementById('modal');
const animeDetails = document.getElementById('animeDetails');
const closeBtn = document.querySelector('.close');

// Charger les top rated au démarrage
async function loadTopRated() {
  try {
    const response = await fetch(`${API_BASE}/top?page=1`);
    const data = await response.json();
    renderGrid(data, topGrid);
  } catch (error) {
    topGrid.innerHTML = '<p>Erreur de chargement</p>';
  }
}

// Recherche
async function search(query) {
  if (!query.trim()) return;
  
  try {
    const response = await fetch(`${API_BASE}/search/${encodeURIComponent(query)}`);
    const data = await response.json();
    
    searchResultsSection.classList.remove('hidden');
    renderGrid(data, resultsGrid);
    
    if (data.length === 0) {
      resultsGrid.innerHTML = '<p>Aucun résultat trouvé</p>';
    }
  } catch (error) {
    resultsGrid.innerHTML = '<p>Erreur de recherche</p>';
  }
}

// Afficher les détails d'un anime
async function showDetails(id) {
  try {
    const response = await fetch(`${API_BASE}/info/${id}`);
    const anime = await response.json();
    
    const genres = anime.Genres || [];
    const genreTags = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
    
    animeDetails.innerHTML = `
      <div class="detail-header">
        <img src="${anime.ImagePath}" alt="${anime.Name}">
        <div class="detail-info">
          <h2>${anime.Name}</h2>
          <p class="meta">
            ⭐ ${anime.MALScore || 'N/A'} &nbsp;|&nbsp; 
            📺 ${anime.epCount || '?'} épisodes &nbsp;|&nbsp;
            ${anime.Status || 'Inconnu'}
          </p>
          <div class="genres">${genreTags}</div>
        </div>
      </div>
      <div class="synopsis">
        <h3>Synopsis</h3>
        <p>${anime.Synopsis || 'Pas de synopsis disponible.'}</p>
      </div>
    `;
    
    modal.classList.remove('hidden');
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Rendu de la grille
function renderGrid(animes, container) {
  container.innerHTML = animes.map(anime => `
    <div class="card" data-id="${anime.ID}">
      <img src="${anime.ImagePath}" alt="${anime.Name}" loading="lazy">
      <div class="card-info">
        <h3>${anime.Name}</h3>
        <p class="score">⭐ ${anime.MALScore || 'N/A'}</p>
      </div>
    </div>
  `).join('');
  
  // Event listeners pour les cartes
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => showDetails(card.dataset.id));
  });
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

// Initialisation
loadTopRated();
