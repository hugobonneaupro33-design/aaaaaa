// ============================================
// NEWS-DATA.JS - GESTION DES ACTUALITÉS
// Anime & Manga Info - Sources d'informations
// ============================================

// ============================================
// CONFIGURATION DES SOURCES
// ============================================
const NEWS_SOURCES = {
  animenews: {
    name: 'Anime News Network',
    url: 'https://www.animenewsnetwork.com/news/rss.xml',
    icon: '📰',
    color: '#2e8b57',
    rssToJson: 'https://api.rss2json.com/v1/api.json?rss_url='
  },
  crunchyroll: {
    name: 'Crunchyroll News',
    url: 'https://www.crunchyroll.com/news/rss',
    icon: '🍣',
    color: '#f47521',
    rssToJson: 'https://api.rss2json.com/v1/api.json?rss_url='
  },
  shonenjump: {
    name: 'Shonen Jump',
    url: 'https://shonenjumpplus.com/rss/news',
    icon: '📖',
    color: '#ff4500',
    rssToJson: 'https://api.rss2json.com/v1/api.json?rss_url='
  },
  webtoon: {
    name: 'Webtoon News',
    url: 'https://www.webtoons.com/en/rss/news',
    icon: '🎨',
    color: '#00bcd4',
    rssToJson: 'https://api.rss2json.com/v1/api.json?rss_url='
  }
};

// ============================================
// DONNÉES D'ACTUALITÉS FALLBACK
// (Utilisées si l'API RSS échoue)
// ============================================
const FALLBACK_NEWS = [
  {
    id: 1,
    title: "One Piece: Le nouveau chapitre 1125 dévoile un secret majeur",
    summary: "Le dernier chapitre de One Piece révèle des informations cruciales sur le passé de Luffy.",
    content: "Eiichiro Oda continue de surprendre ses lecteurs avec des rebondissements inattendus. Le chapitre 1125 apporte son lot de révélations sur le Void Century.",
    image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
    source: "shonenjump",
    date: new Date().toISOString(),
    link: "#",
    author: "Weekly Shonen Jump"
  },
  {
    id: 2,
    title: "Demon Slayer: La saison 4 annoncée pour 2025",
    summary: "L'arc de l'entraînement des piliers arrive enfin en anime.",
    content: "Ufotable confirme la production de la saison 4 de Demon Slayer, adaptant l'arc très attendu de l'entraînement des piliers.",
    image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg",
    source: "animenews",
    date: new Date().toISOString(),
    link: "#",
    author: "Anime News Network"
  },
  {
    id: 3,
    title: "Jujutsu Kaisen: Le manga entre dans son arc final",
    summary: "Gege Akutami prépare le dénouement épique de la série.",
    content: "Le manga Jujutsu Kaisen entame sa dernière ligne droite avec des chapitres toujours plus intenses.",
    image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg",
    source: "crunchyroll",
    date: new Date().toISOString(),
    link: "#",
    author: "Crunchyroll"
  },
  {
    id: 4,
    title: "Tower of God: La saison 2 en production",
    summary: "La suite très attendue du webtoon culte est en cours.",
    content: "Les fans de Tower of God peuvent se réjouir, la saison 2 de l'anime est officiellement en production chez Telecom Animation Film.",
    image: "https://cdn.myanimelist.net/images/anime/1413/119682.jpg",
    source: "webtoon",
    date: new Date().toISOString(),
    link: "#",
    author: "Webtoon"
  },
  {
    id: 5,
    title: "My Hero Academia: Le film 4 annoncé",
    summary: "Un nouveau film original pour les héros de Horikoshi.",
    content: "Un quatrième film My Hero Academia est en préparation, avec une histoire originale supervisée par Kohei Horikoshi.",
    image: "https://cdn.myanimelist.net/images/anime/10/78745.jpg",
    source: "animenews",
    date: new Date().toISOString(),
    link: "#",
    author: "Anime News Network"
  },
  {
    id: 6,
    title: "Solo Leveling: Le drama live-action en développement",
    summary: "Une adaptation en prise de vues réelles est en cours.",
    content: "Le phénomène Solo Leveling aura droit à une adaptation en drama, produite par les studios derrière Sweet Home.",
    image: "https://cdn.myanimelist.net/images/anime/1369/138315.jpg",
    source: "webtoon",
    date: new Date().toISOString(),
    link: "#",
    author: "Webtoon"
  }
];

// Cache des actualités
let newsCache = [];
let lastFetchTime = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// ============================================
// FONCTIONS DE FORMATAGE
// ============================================

/**
 * Formate une date RSS en français
 * @param {string} rssDate - Date au format RSS
 * @returns {string} - Date formatée
 */
function formatRssDate(rssDate) {
  try {
    const date = new Date(rssDate);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    
    if (diff < 1) return 'à l\'instant';
    if (diff < 60) return `il y a ${diff} min`;
    if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`;
    if (diff < 10080) return `il y a ${Math.floor(diff / 1440)}j`;
    
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return 'Date inconnue';
  }
}

/**
 * Nettoie le texte HTML d'un article
 * @param {string} html - HTML brut
 * @returns {string} - Texte nettoyé
 */
function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrait l'image d'un article RSS
 * @param {Object} item - Article RSS
 * @returns {string} - URL de l'image
 */
function extractImageFromRss(item) {
  // Vérifier enclosure
  if (item.enclosure?.link) return item.enclosure.link;
  
  // Vérifier thumbnail
  if (item.thumbnail) return item.thumbnail;
  
  // Rechercher dans le contenu
  const imgMatch = item.content?.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) return imgMatch[1];
  
  // Image par défaut selon la source
  const defaultImages = {
    animenews: 'https://www.animenewsnetwork.com/assets/ann-header-logo.png',
    crunchyroll: 'https://img.crunchyroll.com/assets/logos/crunchyroll_icon.png',
    shonenjump: 'https://cdn.myanimelist.net/images/manga/1/10.jpg',
    webtoon: 'https://cdn.myanimelist.net/images/manga/2/165032.jpg'
  };
  
  return defaultImages[item.source] || 'https://via.placeholder.com/300x180?text=News';
}

// ============================================
// RÉCUPÉRATION DES ACTUALITÉS
// ============================================

/**
 * Récupère les actualités depuis les sources RSS
 * @returns {Promise<Array>} - Liste des actualités
 */
async function fetchNews() {
  // Vérifier le cache
  if (newsCache.length > 0 && lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    console.log('📰 Utilisation du cache actualités');
    return newsCache;
  }
  
  console.log('📰 Récupération des actualités...');
  
  try {
    const allNews = [];
    
    // Parcourir toutes les sources
    for (const [sourceId, source] of Object.entries(NEWS_SOURCES)) {
      try {
        const rssUrl = encodeURIComponent(source.url);
        const apiUrl = `${source.rssToJson}${rssUrl}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          const sourceNews = data.items.slice(0, 10).map(item => ({
            id: `${sourceId}_${Date.now()}_${Math.random()}`,
            title: item.title || 'Sans titre',
            summary: cleanHtml(item.description || '').substring(0, 150),
            content: cleanHtml(item.content || item.description || ''),
            image: extractImageFromRss(item),
            source: sourceId,
            sourceName: source.name,
            sourceIcon: source.icon,
            sourceColor: source.color,
            date: item.pubDate,
            formattedDate: formatRssDate(item.pubDate),
            link: item.link || '#',
            author: item.author || source.name
          }));
          
          allNews.push(...sourceNews);
        }
      } catch (error) {
        console.warn(`⚠️ Erreur source ${source.name}:`, error);
      }
    }
    
    // Trier par date (plus récent d'abord)
    const sortedNews = allNews.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    // Mettre en cache
    newsCache = sortedNews;
    lastFetchTime = Date.now();
    
    console.log(`✅ ${sortedNews.length} actualités chargées`);
    return sortedNews;
    
  } catch (error) {
    console.error('❌ Erreur chargement actualités:', error);
    return getFallbackNews();
  }
}

/**
 * Retourne les actualités de fallback
 * @returns {Array} - Actualités simulées
 */
function getFallbackNews() {
  return FALLBACK_NEWS.map(news => ({
    ...news,
    formattedDate: formatRssDate(news.date),
    sourceName: NEWS_SOURCES[news.source]?.name || news.source,
    sourceIcon: NEWS_SOURCES[news.source]?.icon || '📰',
    sourceColor: NEWS_SOURCES[news.source]?.color || '#e94560'
  }));
}

/**
 * Récupère les actualités par source
 * @param {string} source - ID de la source
 * @returns {Promise<Array>}
 */
async function fetchNewsBySource(source) {
  const allNews = await fetchNews();
  return allNews.filter(news => news.source === source);
}

/**
 * Recherche dans les actualités
 * @param {string} query - Terme de recherche
 * @returns {Promise<Array>}
 */
async function searchNews(query) {
  const allNews = await fetchNews();
  const searchTerm = query.toLowerCase();
  return allNews.filter(news =>
    news.title.toLowerCase().includes(searchTerm) ||
    news.summary.toLowerCase().includes(searchTerm) ||
    news.content.toLowerCase().includes(searchTerm)
  );
}

// ============================================
// AFFICHAGE DES ACTUALITÉS
// ============================================

/**
 * Génère le HTML pour une actualité
 * @param {Object} news - Article d'actualité
 * @returns {string} - HTML
 */
function renderNewsCard(news) {
  return `
    <div class="news-card" data-id="${news.id}" data-link="${news.link}">
      <img src="${news.image}" alt="${news.title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x180?text=News'">
      <div class="news-content">
        <span class="news-source" style="background: ${news.sourceColor}">
          ${news.sourceIcon} ${news.sourceName}
        </span>
        <h3>${escapeHtml(news.title)}</h3>
        <p>${escapeHtml(news.summary)}...</p>
        <div class="news-meta">
          <span>👤 ${escapeHtml(news.author)}</span>
          <span>📅 ${news.formattedDate}</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Affiche les actualités dans le conteneur
 * @param {HTMLElement} container - Conteneur HTML
 * @param {Array} news - Liste des actualités
 */
function displayNews(container, news) {
  if (!container) return;
  
  if (!news || news.length === 0) {
    container.innerHTML = '<div class="error">❌ Aucune actualité disponible</div>';
    return;
  }
  
  container.innerHTML = news.map(renderNewsCard).join('');
  
  // Ajouter les événements de clic
  document.querySelectorAll('.news-card').forEach(card => {
    card.addEventListener('click', () => {
      const link = card.dataset.link;
      if (link && link !== '#') {
        window.open(link, '_blank');
      }
    });
  });
}

/**
 * Affiche les actualités filtrées par source
 * @param {HTMLElement} container - Conteneur HTML
 * @param {string} source - ID de la source (ou 'all')
 */
async function displayNewsBySource(container, source = 'all') {
  if (!container) return;
  
  container.innerHTML = '<div class="loading">⏳ Chargement des actualités...</div>';
  
  try {
    const news = source === 'all' 
      ? await fetchNews() 
      : await fetchNewsBySource(source);
    
    displayNews(container, news);
  } catch (error) {
    console.error('Erreur affichage:', error);
    container.innerHTML = '<div class="error">❌ Erreur de chargement des actualités</div>';
  }
}

// ============================================
// NOTIFICATIONS PUSH
// ============================================

/**
 * Vérifie les nouvelles actualités et envoie une notification
 */
async function checkNewsAndNotify() {
  const lastCheck = localStorage.getItem('lastNewsCheck');
  const today = new Date().toDateString();
  
  if (lastCheck === today) return;
  
  const news = await fetchNews();
  const recentNews = news.filter(n => {
    const newsDate = new Date(n.date);
    const today = new Date();
    return newsDate.toDateString() === today.toDateString();
  });
  
  if (recentNews.length > 0 && Notification.permission === 'granted') {
    new Notification('📰 Nouvelles actualités anime !', {
      body: `${recentNews.length} nouvel${recentNews.length > 1 ? 'les' : 'le'} article${recentNews.length > 1 ? 's' : ''} aujourd'hui.`,
      icon: '/favicon.ico',
      tag: 'daily-news'
    });
  }
  
  localStorage.setItem('lastNewsCheck', today);
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Échappe le HTML pour éviter les injections XSS
 * @param {string} str - Texte à échapper
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// EXPORT DES FONCTIONS
// ============================================
window.NewsData = {
  fetchNews,
  fetchNewsBySource,
  searchNews,
  displayNews,
  displayNewsBySource,
  renderNewsCard,
  checkNewsAndNotify,
  NEWS_SOURCES,
  FALLBACK_NEWS
};

// Initialisation
if (typeof window !== 'undefined') {
  // Vérifier les nouvelles actualités quotidiennement
  setTimeout(() => checkNewsAndNotify(), 10000);
}

console.log('✅ news-data.js chargé');
