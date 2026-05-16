// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
let currentLang = 'vf';
let animeData = null;

// Données simulées des épisodes (à remplacer par API)
const episodesData = {
  1: {
    title: "One Piece",
    synopsis: "L'histoire de Monkey D. Luffy et son équipage à la recherche du One Piece.",
    episodes: Array.from({ length: 1122 }, (_, i) => ({
      number: i + 1,
      title: `Épisode ${i + 1}`,
      vfUrl: `https://example.com/ep${i+1}-vf.mp4`,
      vostfrUrl: `https://example.com/ep${i+1}-vostfr.mp4`
    }))
  }
};

async function loadAnime() {
  if (!animeId) return;
  
  animeData = episodesData[animeId] || episodesData[1];
  
  document.getElementById('animeTitle').textContent = animeData.title;
  document.getElementById('currentAnimeTitle').textContent = animeData.title;
  document.getElementById('animeSynopsis').textContent = animeData.synopsis;
  
  loadEpisodes();
  loadEpisode(1);
}

function loadEpisodes() {
  const container = document.getElementById('episodesList');
  container.innerHTML = animeData.episodes.map(ep => `
    <div class="episode-card" data-ep="${ep.number}">
      <div class="episode-num">Ép. ${ep.number}</div>
      <div class="episode-title">${ep.title}</div>
      <button class="watch-episode-btn">▶ Regarder</button>
    </div>
  `).join('');
  
  document.querySelectorAll('.episode-card').forEach(card => {
    card.addEventListener('click', () => {
      const epNum = parseInt(card.dataset.ep);
      loadEpisode(epNum);
    });
  });
}

function loadEpisode(episodeNumber) {
  const episode = animeData.episodes.find(ep => ep.number === episodeNumber);
  if (!episode) return;
  
  const videoUrl = currentLang === 'vf' ? episode.vfUrl : episode.vostfrUrl;
  const videoFrame = document.getElementById('videoFrame');
  
  // Intégration lecteur (exemple avec embeds)
  videoFrame.src = videoUrl;
  
  // Mettre à jour l'épisode actif
  document.querySelectorAll('.episode-card').forEach(card => {
    card.classList.remove('active');
    if (parseInt(card.dataset.ep) === episodeNumber) {
      card.classList.add('active');
    }
  });
}

// Changement de langue
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLang = btn.dataset.lang;
    
    // Recharger l'épisode actuel
    const activeEp = document.querySelector('.episode-card.active');
    if (activeEp) {
      loadEpisode(parseInt(activeEp.dataset.ep));
    }
  });
});

loadAnime();
