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
  console.log('DOM chargé, chargement du contenu...');
  loadContent();
  setupEventListeners();
});

async function loadContent() {
  console.log('loadContent appelé, contentType:', contentType, 'contentId:', contentId);
  
  if (!contentId || !contentType) {
    showError('Aucun contenu spécifié. Vérifie le lien.');
    return;
  }

  showLoading();

  try {
    // Récupérer les infos depuis l'API
    const response = await fetch(`${API_BASE}/${contentType}/${contentId}`);
    if (!response.ok) throw new Error('Erreur de chargement');
    const data = await response.json();
    contentData = data.data;
    
    console.log('Contenu chargé:', contentData.title);

    // Mettre à jour les titres
    const animeTitleEl = document.getElementById('animeTitle');
    const currentAnimeTitleEl = document.getElementById('currentAnimeTitle');
    const animeSynopsisEl = document.getElementById('animeSynopsis');
    
    if (animeTitleEl) animeTitleEl.textContent = contentData.title;
    if (currentAnimeTitleEl) currentAnimeTitleEl.textContent = contentData.title;
    if (animeSynopsisEl) animeSynopsisEl.textContent = contentData.synopsis || 'Synopsis non disponible.';

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
  console.log('generateEpisodesList, contentType:', contentType);
  
  if (contentType === 'anime') {
    const episodeCount = contentData.episodes || 24;
    episodesList = Array.from({ length: Math.min(episodeCount, 500) }, (_, i) => ({
      number: i + 1,
      title: `Épisode ${i + 1}`,
      thumbnail: contentData.images?.jpg?.image_url || 'https://via.placeholder.com/120x68?text=Episode',
      vfUrl: getEmbedUrl(contentId, i + 1, 'vf'),
      vostfrUrl: getEmbedUrl(contentId, i + 1, 'vostfr')
    }));
  } else if (contentType === 'manga') {
    const chapterCount = contentData.chapters || 100;
    episodesList = Array.from({ length: Math.min(chapterCount, 300) }, (_, i) => ({
      number: i + 1,
      title: `Chapitre ${i + 1}`,
      thumbnail: contentData.images?.jpg?.image_url || 'https://via.placeholder.com/120x68?text=Chapitre',
      vfUrl: getMangaReaderUrl(contentId, i + 1),
      vostfrUrl: getMangaReaderUrl(contentId, i + 1)
    }));
  } else if (contentType === 'webtoon') {
    episodesList = Array.from({ length: 50 }, (_, i) => ({
      number: i + 1,
      title: `Chapitre ${i + 1}`,
      thumbnail: contentData.images?.jpg?.image_url || 'https://via.placeholder.com/120x68?text=Chapitre',
      vfUrl: getWebtoonUrl(contentId, i + 1),
      vostfrUrl: getWebtoonUrl(contentId, i + 1)
    }));
  }

  console.log('Épisodes générés:', episodesList.length);
  loadEpisodesList();
}

function getEmbedUrl(animeId, episode, lang) {
  // Sources d'embed gratuites (à remplacer par tes sources)
  const embedSources = {
    'vf': `https://voe.sx/e/${animeId}-${episode}`,
    'vostfr': `https://send.cm/embed/${animeId}-${episode}`
  };
  return embedSources[lang];
}

function getMangaReaderUrl(mangaId, chapter) {
  // Sites de lecture de manga
  return `https://mangadex.org/title/${mangaId}/chapter/${chapter}`;
}

function getWebtoonUrl(webtoonId, chapter) {
  return `https://www.webtoons.com/fr/${webtoonId}/episode-${chapter}/viewer`;
}

function loadEpisodesList() {
  const container = document.getElementById('episodesList');
  if (!container) {
    console.error('Container episodesList non trouvé');
    return;
  }

  if (episodesList.length === 0) {
    container.innerHTML = '<div class="error">Aucun épisode disponible</div>';
    return;
  }

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
      if (!isNaN(epNum)) loadEpisode(epNum);
    });
  });

  document.querySelectorAll('.watch-episode-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const epNum = parseInt(btn.dataset.ep);
      if (!isNaN(epNum)) loadEpisode(epNum);
    });
  });
  
  // Mettre à jour l'affichage de l'épisode courant
  const currentDisplay = document.getElementById('currentEpisodeDisplay');
  if (currentDisplay) {
    currentDisplay.textContent = `${contentType === 'anime' ? 'Épisode' : 'Chapitre'} ${currentEpisode}`;
  }
}

function loadEpisode(episodeNumber) {
  console.log('loadEpisode:', episodeNumber);
  currentEpisode = episodeNumber;
  const episode = episodesList.find(ep => ep.number === episodeNumber);
  if (!episode) {
    console.error('Épisode non trouvé:', episodeNumber);
    return;
  }

  const videoUrl = currentLang === 'vf' ? episode.vfUrl : episode.vostfrUrl;
  const videoFrame = document.getElementById('videoFrame');
  const embedContainer = document.getElementById('embedContainer');

  if (!videoFrame) {
    console.error('videoFrame non trouvé');
    return;
  }

  // Afficher le chargement
  showVideoLoading();

  // Pour les vidéos
  if (contentType === 'anime') {
    videoFrame.style.display = 'block';
    if (embedContainer) embedContainer.style.display = 'none';
    videoFrame.src = videoUrl;
    setTimeout(() => hideVideoLoading(), 1000);
  } 
  // Pour les mangas/webtoons
  else {
    videoFrame.style.display = 'none';
    if (embedContainer) {
      embedContainer.style.display = 'block';
      embedContainer.innerHTML = `
        <div class="manga-reader">
          <iframe src="${videoUrl}" frameborder="0" allowfullscreen></iframe>
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

  // Mettre à jour l'affichage
  const currentDisplay = document.getElementById('currentEpisodeDisplay');
  if (currentDisplay) {
    currentDisplay.textContent = `${contentType === 'anime' ? 'Épisode' : 'Chapitre'} ${episodeNumber}`;
  }

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
  if (typeof currentUser !== 'undefined' && currentUser && typeof db !== 'undefined' && db) {
    try {
      const userRef = db.collection('users').doc(currentUser.uid);
      userRef.set({
        [`progress.${contentType}.${contentId}`]: episode,
        lastWatched: new Date().toISOString()
      }, { merge: true });
      console.log('Progression sauvegardée:', episode);
    } catch (error) {
      console.error('Erreur sauvegarde progression:', error);
    }
  }
}

function setupEventListeners() {
  // Changement de langue
  const langBtns = document.querySelectorAll('.lang-btn');
  console.log('Boutons de langue trouvés:', langBtns.length);
  
  langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      console.log('Langue changée:', currentLang);
      
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
  
  // Recherche d'épisodes
  const episodeSearch = document.getElementById('episodeSearch');
  if (episodeSearch) {
    episodeSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.episode-card');
      cards.forEach(card => {
        const title = card.querySelector('.episode-title')?.textContent.toLowerCase() || '';
        const episodeNum = card.dataset.ep;
        if (title.includes(searchTerm) || episodeNum?.includes(searchTerm)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
}

function showLoading() {
  const container = document.getElementById('episodesList');
  if (container) {
    container.innerHTML = '<div class="loading">⏳ Chargement des épisodes...</div>';
  }
  
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame) {
    videoFrame.src = '';
  }
}

function showError(message) {
  console.error('Erreur:', message);
  const container = document.getElementById('episodesList');
  if (container) {
    container.innerHTML = `<div class="error">❌ ${message}</div>`;
  }
  const videoFrame = document.getElementById('videoFrame');
  if (videoFrame) {
    videoFrame.src = '';
  }
  
  // Afficher également dans le conteneur principal si besoin
  const animeDetailContainer = document.getElementById('animeDetailContainer');
  if (animeDetailContainer && !contentData) {
    animeDetailContainer.innerHTML = `<div class="error">❌ ${message}</div>`;
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

// Export pour débogage
console.log('detail-page.js chargé');
