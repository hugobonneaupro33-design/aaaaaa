// ============================================
// DETAIL PAGE JS - ANIME & MANGA INFO
// Gestion de la page de détail des animes
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_BASE = 'https://api.jikan.moe/v4';
const CORS_PROXY = 'https://corsproxy.io/?url=';

// Récupération de l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
const mangaId = urlParams.get('manga');
const webtoonId = urlParams.get('webtoon');
const contentType = animeId ? 'anime' : (mangaId ? 'manga' : (webtoonId ? 'webtoon' : null));
const contentId = animeId || mangaId || webtoonId;

let currentSynopsisLang = 'fr';
let currentPage = 1;
let isLoading = false;

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
// CHARGEMENT DES DÉTAILS
// ============================================
async function loadContent() {
  const container = document.getElementById('animeDetailContainer');
  if (!container) return;
  
  if (!contentId || !contentType) {
    container.innerHTML = '<div class="error">❌ ID du contenu manquant</div>';
    return;
  }

  container.innerHTML = '<div class="loading">⏳ Chargement des informations...</div>';

  try {
    const response = await fetchWithProxy(`${API_BASE}/${contentType}/${contentId}`);
    const data = await response.json();
    const content = data.data;

    if (!content) {
      throw new Error('Contenu non trouvé');
    }

    const episodeCount = contentType === 'anime' 
      ? (episodeCorrections[contentId] || content.episodes || 24)
      : (content.chapters || 100);
    
    const episodes = Array.from({ length: Math.min(episodeCount, 300) }, (_, i) => i + 1);
    const isAiring = content.status === 'Currently Airing';
    const releaseDate = content.aired?.from 
      ? new Date(content.aired.from).toLocaleDateString('fr-FR')
      : (content.published?.from ? new Date(content.published.from).toLocaleDateString('fr-FR') : 'Date inconnue');
    
    let nextEpisodeText = '';
    if (contentType === 'anime' && isAiring && content.broadcast?.day) {
      nextEpisodeText = `<div class="next-episode">📺 Prochain épisode: ${content.broadcast.day || '?'} à ${content.broadcast.time || '?'}</div>`;
    }

    // Récupérer les thèmes supplémentaires si disponible
    const themes = content.themes || [];
    const demographics = content.demographics || [];

    container.innerHTML = `
      <!-- Hero Section -->
      <div class="detail-hero">
        <img src="${content.images.jpg.large_image_url || content.images.jpg.image_url}" alt="${content.title}" onerror="this.src='https://via.placeholder.com/250x350?text=No+Image'">
        <div class="detail-hero-info">
          <h1>${escapeHtml(content.title)}</h1>
          <h2>${escapeHtml(content.title_english || content.title_japanese || '')}</h2>
          <div class="detail-stats">
            <span class="stat">⭐ ${content.score || 'N/A'}</span>
            <span class="stat">📊 Rang #${content.rank || 'N/A'}</span>
            <span class="stat">❤️ ${content.favorites?.toLocaleString() || '0'} favoris</span>
            <span class="stat">📺 ${episodeCount} ${contentType === 'anime' ? 'épisodes' : 'chapitres'}</span>
          </div>
          ${nextEpisodeText}
          <a href="${contentType === 'anime' ? 'watch.html' : 'manga-reader.html'}?id=${contentId}&ep=1" class="watch-btn">
            ▶ ${contentType === 'anime' ? 'Regarder l\'épisode 1' : 'Lire le chapitre 1'}
          </a>
        </div>
      </div>

      <!-- Informations détaillées -->
      <div class="detail-info-grid">
        <div class="info-card">
          <h3>📅 Informations</h3>
          <p><strong>Statut:</strong> ${isAiring ? '🟢 En cours' : (content.status === 'Finished Airing' || content.status === 'Finished' ? '✅ Terminé' : '📅 À venir')}</p>
          <p><strong>${contentType === 'anime' ? 'Épisodes' : 'Chapitres'}:</strong> ${episodeCount}</p>
          <p><strong>${contentType === 'anime' ? 'Durée' : 'Volumes'}:</strong> ${content.duration || content.volumes || 'N/A'}</p>
          <p><strong>${contentType === 'anime' ? 'Studio' : 'Auteur(s)'}:</strong> ${contentType === 'anime' 
            ? (content.studios?.map(s => s.name).join(', ') || 'N/A')
            : (content.authors?.map(a => a.name).join(', ') || 'N/A')}</p>
          <p><strong>Date début:</strong> ${releaseDate}</p>
        </div>
        <div class="info-card">
          <h3>🏷️ Genres</h3>
          <div class="genres-list">
            ${content.genres?.map(g => `<span class="genre-tag">${escapeHtml(g.name)}</span>`).join('') || 'Aucun genre'}
          </div>
          ${themes.length > 0 ? `
            <h3 style="margin-top: 1rem;">🎭 Thèmes</h3>
            <div class="genres-list">
              ${themes.map(t => `<span class="genre-tag">${escapeHtml(t.name)}</span>`).join('')}
            </div>
          ` : ''}
          ${demographics.length > 0 ? `
            <h3 style="margin-top: 1rem;">👥 Démographie</h3>
            <div class="genres-list">
              ${demographics.map(d => `<span class="genre-tag">${escapeHtml(d.name)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="info-card">
          <h3>📺 Diffusion</h3>
          <p><strong>Jour:</strong> ${content.broadcast?.day || content.published?.day || 'Inconnu'}</p>
          <p><strong>Horaire:</strong> ${content.broadcast?.time || content.published?.time || 'Inconnu'}</p>
          <p><strong>${contentType === 'anime' ? 'Diffuseur' : 'Éditeur'}:</strong> ${content.broadcast?.string || content.publishers?.map(p => p.name).join(', ') || 'N/A'}</p>
          ${contentType === 'anime' && content.season ? `
            <p><strong>Saison:</strong> ${content.season} ${content.year}</p>
          ` : ''}
        </div>
      </div>

      <!-- Synopsis bilingue -->
      <div class="synopsis-container">
        <div class="synopsis-tabs">
          <button class="synopsis-tab ${currentSynopsisLang === 'fr' ? 'active' : ''}" data-lang="fr">🇫🇷 Français</button>
          <button class="synopsis-tab ${currentSynopsisLang === 'en' ? 'active' : ''}" data-lang="en">🇬🇧 English</button>
        </div>
        <div id="synopsisContent" class="synopsis-content">
          ${content.synopsis || 'Synopsis non disponible.'}
        </div>
      </div>

      <!-- Liste des épisodes/chapitres -->
      <div class="episodes-section">
        <div class="episodes-header">
          <h3>📺 Liste des ${contentType === 'anime' ? 'épisodes' : 'chapitres'} (${episodes.length})</h3>
          <input type="text" id="episodeSearch" class="episode-search" placeholder="🔍 Rechercher un ${contentType === 'anime' ? 'épisode' : 'chapitre'}...">
        </div>
        <div id="episodeList" class="episode-list">
          ${renderEpisodeList(episodes)}
        </div>
        <div id="episodePagination" class="pagination" style="margin-top: 1rem;"></div>
      </div>
    `;

    // Gestion synopsis bilingue
    document.querySelectorAll('.synopsis-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentSynopsisLang = tab.dataset.lang;
        document.querySelectorAll('.synopsis-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const synopsisDiv = document.getElementById('synopsisContent');
        if (synopsisDiv) {
          if (currentSynopsisLang === 'en') {
            synopsisDiv.textContent = content.synopsis || 'Synopsis not available.';
          } else {
            synopsisDiv.textContent = content.synopsis || 'Synopsis non disponible.';
          }
        }
      });
    });

    // Initialiser la pagination des épisodes
    setupEpisodePagination(episodes);
    
    // Recherche d'épisodes
    const searchInput = document.getElementById('episodeSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.episode-item').forEach(item => {
          const epNum = item.dataset.ep;
          if (epNum.includes(searchTerm)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }

  } catch (error) {
    console.error('Erreur:', error);
    container.innerHTML = `
      <div class="error">
        ❌ Erreur de chargement<br>
        <small>${escapeHtml(error.message)}</small>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--primary); border: none; border-radius: 8px; color: white; cursor: pointer;">🔄 Réessayer</button>
      </div>
    `;
    showToast('Erreur de chargement du contenu', 'error');
  }
}

function renderEpisodeList(episodes, start = 0, end = 30) {
  const displayEpisodes = episodes.slice(start, end);
  return displayEpisodes.map(ep => `
    <div class="episode-item" data-ep="${ep}">
      ${contentType === 'anime' ? 'Ép.' : 'Ch.'} ${ep}
    </div>
  `).join('');
}

function setupEpisodePagination(episodes) {
  const itemsPerPage = 30;
  const totalPages = Math.ceil(episodes.length / itemsPerPage);
  let currentEpisodePage = 1;

  function renderPage(page) {
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const episodeList = document.getElementById('episodeList');
    if (episodeList) {
      episodeList.innerHTML = renderEpisodeList(episodes, start, end);
      
      // Ajouter les événements de clic
      document.querySelectorAll('.episode-item').forEach(item => {
        item.addEventListener('click', () => {
          const epNum = item.dataset.ep;
          window.location.href = `${contentType === 'anime' ? 'watch.html' : 'manga-reader.html'}?id=${contentId}&ep=${epNum}`;
        });
      });
    }
    updatePaginationButtons(page, totalPages);
  }

  function updatePaginationButtons(currentPage, total) {
    const paginationDiv = document.getElementById('episodePagination');
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
    
    document.querySelectorAll('#episodePagination .page-btn').forEach(btn => {
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const newPage = parseInt(btn.dataset.page);
          if (!isNaN(newPage) && newPage !== currentPage) {
            currentEpisodePage = newPage;
            renderPage(currentEpisodePage);
          }
        });
      }
    });
  }

  renderPage(1);
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
  loadContent();
});

// ============================================
// GESTION DES FAVORIS (si intégré)
// ============================================
async function addToFavorites() {
  if (typeof toggleFavorite !== 'undefined' && contentId) {
    const isFav = await toggleFavorite(contentId, content?.title, content?.score, content?.images?.jpg?.image_url);
    showToast(isFav ? 'Ajouté aux favoris ❤️' : 'Retiré des favoris 💔');
  }
}

console.log('✅ detail-page.js chargé');
