// Données d'actualités (à remplacer par une API plus tard)
const newsDatabase = {
  all: [
    {
      id: 1,
      title: "Nouvel arc de One Piece annoncé !",
      source: "shonenjump",
      image: "https://via.placeholder.com/300x200?text=One+Piece",
      summary: "Eiichiro Oda dévoile les premiers détails du prochain arc...",
      date: "2025-05-15",
      link: "#",
      category: "manga"
    },
    {
      id: 2,
      title: "Demon Slayer : Nouvelle saison confirmée",
      source: "crunchyroll",
      image: "https://via.placeholder.com/300x200?text=Demon+Slayer",
      summary: "La saison 4 adaptant l'arc de l'entraînement des piliers arrive en 2025.",
      date: "2025-05-14",
      link: "#",
      category: "anime"
    },
    {
      id: 3,
      title: "Interview exclusive du créateur de Tower of God",
      source: "webtoon",
      image: "https://via.placeholder.com/300x200?text=Tower+of+God",
      summary: "SIU parle de la saison 3 et des projets futurs.",
      date: "2025-05-13",
      link: "#",
      category: "webtoon"
    },
    {
      id: 4,
      title: "My Hero Academia : Le manga entre dans son arc final",
      source: "animenews",
      image: "https://via.placeholder.com/300x200?text=MHA",
      summary: "Kohei Horikoshi prépare le dénouement épique.",
      date: "2025-05-12",
      link: "#",
      category: "manga"
    }
  ]
};

// Fonction pour charger les actualités
function loadNews(filter = "all") {
  const newsGrid = document.getElementById('newsGrid');
  if (!newsGrid) return;
  
  let articles = newsDatabase.all;
  if (filter !== "all") {
    articles = articles.filter(a => a.source === filter);
  }
  
  newsGrid.innerHTML = articles.map(article => `
    <div class="news-card" data-id="${article.id}">
      <img src="${article.image}" alt="${article.title}" loading="lazy">
      <div class="news-content">
        <span class="news-source ${article.source}">${getSourceName(article.source)}</span>
        <h3>${article.title}</h3>
        <p>${article.summary}</p>
        <div class="news-meta">
          <span class="news-date">📅 ${formatDate(article.date)}</span>
          <span class="news-category">${article.category}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function getSourceName(source) {
  const sources = {
    'shonenjump': '📖 Shonen Jump',
    'animenews': '📰 Anime News Network',
    'crunchyroll': '🍣 Crunchyroll News',
    'webtoon': '🎨 Webtoon'
  };
  return sources[source] || source;
}

function formatDate(dateStr) {
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateStr).toLocaleDateString('fr-FR', options);
}
