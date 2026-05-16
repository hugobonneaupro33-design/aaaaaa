// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
const mangaId = urlParams.get('manga');
const webtoonId = urlParams.get('webtoon');
const contentType = animeId ? 'anime' : (mangaId ? 'manga' : (webtoonId ? 'webtoon' : null));
const contentId = animeId || mangaId || webtoonId;

let currentLang = 'vf';
let currentEpisode = 1;
let contentData = null;
let episodesList = [];

// API Jikan pour récupérer les infos
const API_BASE = 'https://api.jikan.moe/v4';

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', () => {
  loadContent();
  setupEventListeners();
});

async function loadContent() {
  if (!contentId || !contentType) {
    showError('Aucun contenu spécifié');
    return;
  }

  showLoading();

  try {
    // Récupérer les infos depuis l'API
    const response = await fetch(`${API_BASE}/${contentType}/${contentId}`);
    if (!response.ok) throw new Error('Erreur de chargement');
    const data = await response.json();
    contentData = data.data;

    // Mettre à jour les titres
    document.getElementById('animeTitle').textContent = contentData.title;
    document.getElementById('currentAnimeTitle').textContent = contentData.title;
    document.getElementById('animeSynopsis').textContent = contentData.synopsis || 'Synopsis non disponible.';

    // Générer la liste des épisodes/chapitres
    generateEpisodesList();
    
    // Charger le premier épisode/chapitre
    if (episodesList.length > 0) {
      loadEpisode(currentEpisode);
    } else {
      showError('Aucun épisode disponible');
    }

  } catch (error) {
    console.error('Erreur:', error);
    showError('Impossible de charger le contenu. Vérifie ta connexion.');
  }
}

function generateEpisodesList() {
  if (contentType === 'anime') {
    const episodeCount = contentData.episodes || 24;
    episodesList = Array.from({ length: episodeCount }, (_, i) => ({
      number: i + 1,
      title: `Épisode ${i + 1}${contentData.title ? ' - ' + contentData.title : ''}`,
      thumbnail: contentData.images?.jpg?.image_url || '',
      vfUrl: getEmbedUrl(contentId, i + 1, 'vf'),
      vostfrUrl: getEmbedUrl(contentId, i + 1, 'vostfr')
    }));
  } else if (contentType === 'manga') {
    const chapterCount = contentData.chapters || 100;
    episodesList = Array.from({ length: chapterCount }, (_, i) => ({
      number: i + 1,
      title: `Chapitre ${i + 1}`,
      thumbnail: contentData.images?.jpg?.image_url || '',
      vfUrl: getMangaReaderUrl(contentId, i + 1),
      vostfrUrl: getMangaReaderUrl(contentId, i + 1)
    }));
  } else if (contentType === 'webtoon') {
    episodesList = Array.from({ length: 50 }, (_, i) => ({
      number: i + 1,
      title: `Chapitre ${i + 1}`,
      thumbnail: contentData.images?.jpg?.image_url || '',
      vfUrl: getWebtoonUrl(contentId, i + 1),
      vostfrUrl: getWebtoonUrl(contentId, i + 1)
    }));
  }

  loadEpisodesList();
}

function getEmbedUrl(animeId, episode, lang) {
  // Sources d'embed gratuites (à remplacer par tes sources)
  const embedSources = {
    'vf': `https://voe.sx/embed/${animeId}-${episode}`,
    'vostfr': `https://send.cm/embed/${animeId}-${episode}`
  };
  return embedSources[lang];
}

function getMangaReaderUrl(mangaId, chapter) {
  return `https://manga-scantrad.net/manga/${mangaId}/${chapter}`;
}

function getWebtoonUrl(webtoonId, chapter) {
  return `https://www.webtoons.com/${webtoonId}/episode-${chapter}`;
}

function loadEpisodesList() {
  const container = document.getElementById('episodesList');
  if (!container) return;

  container.innerHTML = episodesList.map(ep => `
    <div class="episode-card ${ep.number === currentEpisode ? 'active' : ''}" data-ep="${ep.number}">
      <div class="episode-thumb">
        <img src="${ep.thumbnail}" alt="Épisode ${ep.number}" onerror="this.src='https://via.placeholder.com/120x68?text=Episode+${ep.number}'">
      </div>
      <div class="episode-info">
        <div class="episode-num">${contentType === 'anime' ? 'Ép.' : 'Ch.'} ${ep.number}</div>
        <div class="episode-title">${ep.title}</div>
      </div>
      <button class="watch-episode-btn" data-ep="${ep.number}">▶ Regarder</button>
    </div>
  `).join('');

  // Ajouter les événements
  document.querySelectorAll('.episode-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('watch-episode-btn')) return;
      const epNum = parseInt(card.dataset.ep);
      loadEpisode(epNum);
    });
  });

  document.querySelectorAll('.watch-episode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const epNum = parseInt(btn.dataset.ep);
      loadEpisode(epNum);
    });
  });
}

function loadEpisode(episodeNumber) {
  currentEpisode = episodeNumber;
  const episode = episodesList.find(ep => ep.number === episodeNumber);
  if (!episode) return;

  const videoUrl = currentLang === 'vf' ? episode.vfUrl : episode.vostfrUrl;
  const videoFrame = document.getElementById('videoFrame');
  const embedContainer = document.getElementById('embedContainer');

  if (!videoFrame) return;

  // Afficher le chargement
  showVideoLoading();

  // Pour les vidéos
  if (contentType === 'anime') {
    videoFrame.style.display = 'block';
    if (embedContainer) embedContainer.style.display = 'none';
    videoFrame.src = videoUrl;
    videoFrame.onload = () => hideVideoLoading();
  } 
  // Pour les mangas/webtoons (affichage d'images)
  else {
    videoFrame.style.display = 'none';
    if (embedContainer) {
      embedContainer.style.display = 'block';
      embedContainer.innerHTML = `
        <div class="manga-reader">
          <iframe src="${videoUrl}" frameborder="0"></iframe>
        </div>
      `;
      hideVideoLoading();
    }
  }

  // Mettre à jour l'épisode actif
  document.querySelectorAll('.episode-card').forEach(card => {
    card.classList.remove('active');
    if (parseInt(card.dataset.ep) === episodeNumber) {
      card.classList.add('active');
    }
  });

  // Scroller jusqu'à l'épisode actif
  const activeCard = document.querySelector('.episode-card.active');
  if (activeCard) {
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Sauvegarder la progression
  saveProgress(episodeNumber);
}

function showVideoLoading() {
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame) {
    videoFrame.style.opacity = '0.5';
  }
}

function hideVideoLoading() {
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame) {
    videoFrame.style.opacity = '1';
  }
}

function saveProgress(episode) {
  if (!currentUser) return;
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    userRef.set({
      [`progress.${contentType}.${contentId}`]: episode,
      lastWatched: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Erreur sauvegarde progression:', error);
  }
}

function setupEventListeners() {
  // Changement de langue
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      
      // Recharger l'épisode actuel
      loadEpisode(currentEpisode);
    });
  });

  // Navigation épisodes
  const prevBtn = document.getElementById('prevEpisodeBtn');
  const nextBtn = document.getElementById('nextEpisodeBtn');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentEpisode > 1) {
        loadEpisode(currentEpisode - 1);
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentEpisode < episodesList.length) {
        loadEpisode(currentEpisode + 1);
      }
    });
  }
}

function showLoading() {
  const container = document.getElementById('episodesList');
  if (container) {
    container.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  }
}

function showError(message) {
  const container = document.getElementById('episodesList');
  if (container) {
    container.innerHTML = `<div class="error">❌ ${message}</div>`;
  }
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame) {
    videoFrame.src = '';
  }
}

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if (e.key === 'ArrowLeft') {
    if (currentEpisode > 1) loadEpisode(currentEpisode - 1);
  } else if (e.key === 'ArrowRight') {
    if (currentEpisode < episodesList.length) loadEpisode(currentEpisode + 1);
  }
});
