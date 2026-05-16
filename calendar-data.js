// ============================================
// CALENDAR-DATA.JS - GESTION DU CALENDRIER
// Anime & Manga Info - Planning des sorties
// ============================================

// ============================================
// STRUCTURE DES DONNÉES
// ============================================
const DAYS_FR = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Noms des mois en français
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ============================================
// DONNÉES DE SORTIES SIMULÉES (FALLBACK)
// En attendant l'API réelle
// ============================================
const FALLBACK_SCHEDULE = {
  monday: [
    { id: 21, title: "One Piece", episode: 1122, time: "09:30", image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg", type: "anime" },
    { id: 2, title: "Black Clover", episode: 170, time: "10:00", image: "https://cdn.myanimelist.net/images/anime/2/76014.jpg", type: "anime" }
  ],
  tuesday: [
    { id: 7, title: "Jujutsu Kaisen", episode: 47, time: "11:00", image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg", type: "anime" }
  ],
  wednesday: [
    { id: 8, title: "Demon Slayer", episode: 55, time: "10:30", image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg", type: "anime" }
  ],
  thursday: [
    { id: 9, title: "My Hero Academia", episode: 138, time: "09:00", image: "https://cdn.myanimelist.net/images/anime/10/78745.jpg", type: "anime" }
  ],
  friday: [
    { id: 6, title: "Attack on Titan", episode: 87, time: "08:00", image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", type: "anime" }
  ],
  saturday: [
    { id: 10, title: "Boruto", episode: 293, time: "11:30", image: "https://cdn.myanimelist.net/images/anime/9/78917.jpg", type: "anime" }
  ],
  sunday: [
    { id: 15, title: "Dragon Ball Daima", episode: 12, time: "10:00", image: "https://cdn.myanimelist.net/images/anime/1947/144122.jpg", type: "anime" }
  ]
};

// Données des mangas
const MANGA_SCHEDULE = {
  monday: [
    { id: 21, title: "One Piece", chapter: 1125, time: "10:00", image: "https://cdn.myanimelist.net/images/manga/1/10.jpg", type: "manga" }
  ],
  wednesday: [
    { id: 7, title: "Jujutsu Kaisen", chapter: 255, time: "11:00", image: "https://cdn.myanimelist.net/images/manga/3/196750.jpg", type: "manga" }
  ],
  friday: [
    { id: 9, title: "My Hero Academia", chapter: 398, time: "12:00", image: "https://cdn.myanimelist.net/images/manga/3/205975.jpg", type: "manga" }
  ],
  sunday: [
    { id: 10, title: "Boruto", chapter: 80, time: "09:00", image: "https://cdn.myanimelist.net/images/manga/3/192797.jpg", type: "manga" }
  ]
};

// Données des webtoons
const WEBTOON_SCHEDULE = {
  thursday: [
    { id: 301, title: "Tower of God", chapter: 600, time: "14:00", image: "https://cdn.myanimelist.net/images/manga/2/165032.jpg", type: "webtoon" }
  ],
  saturday: [
    { id: 302, title: "Solo Leveling", chapter: 179, time: "15:00", image: "https://cdn.myanimelist.net/images/manga/2/209195.jpg", type: "webtoon" }
  ]
};

// ============================================
// FONCTIONS DE DATE
// ============================================

/**
 * Obtient la semaine actuelle (début et fin)
 * @param {Date} date - Date de référence (optionnel)
 * @returns {Object} - { start, end }
 */
function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Formate une date en français
 * @param {Date} date - Date à formater
 * @returns {string} - Date formatée
 */
function formatDateFr(date) {
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Obtient le nom du jour en français
 * @param {string} dayKey - Clé du jour (monday, tuesday...)
 * @returns {string} - Nom du jour en français
 */
function getDayNameFr(dayKey) {
  return DAYS_FR[dayKey] || dayKey;
}

/**
 * Vérifie si une sortie est aujourd'hui
 * @param {Date} releaseDate - Date de sortie
 * @returns {boolean}
 */
function isReleasedToday(releaseDate) {
  const today = new Date();
  return releaseDate.getDate() === today.getDate() &&
         releaseDate.getMonth() === today.getMonth() &&
         releaseDate.getFullYear() === today.getFullYear();
}

// ============================================
// FONCTIONS DE RÉCUPÉRATION DES SORTIES
// ============================================

/**
 * Obtient les sorties du jour (tous types)
 * @returns {Array} - Liste des sorties du jour
 */
function getTodayReleases() {
  const todayIndex = new Date().getDay();
  const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const todayKey = dayMap[todayIndex];
  
  const animeReleases = FALLBACK_SCHEDULE[todayKey] || [];
  const mangaReleases = MANGA_SCHEDULE[todayKey] || [];
  const webtoonReleases = WEBTOON_SCHEDULE[todayKey] || [];
  
  return [...animeReleases, ...mangaReleases, ...webtoonReleases];
}

/**
 * Obtient les sorties du jour par type
 * @param {string} type - 'anime', 'manga', 'webtoon'
 * @returns {Array}
 */
function getTodayReleasesByType(type) {
  const todayIndex = new Date().getDay();
  const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const todayKey = dayMap[todayIndex];
  
  switch(type) {
    case 'anime': return FALLBACK_SCHEDULE[todayKey] || [];
    case 'manga': return MANGA_SCHEDULE[todayKey] || [];
    case 'webtoon': return WEBTOON_SCHEDULE[todayKey] || [];
    default: return [];
  }
}

/**
 * Obtient toutes les sorties d'une semaine
 * @param {Date} startDate - Date de début de semaine
 * @returns {Object} - Planning de la semaine
 */
function getWeekReleases(startDate = new Date()) {
  const weekReleases = {};
  const weekStart = new Date(startDate);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(weekStart);
    currentDate.setDate(weekStart.getDate() + i);
    const dayName = DAYS_ORDER[i];
    
    weekReleases[dayName] = {
      anime: FALLBACK_SCHEDULE[dayName] || [],
      manga: MANGA_SCHEDULE[dayName] || [],
      webtoon: WEBTOON_SCHEDULE[dayName] || [],
      date: new Date(currentDate)
    };
  }
  
  return weekReleases;
}

/**
 * Obtient les prochaines sorties (7 jours glissants)
 * @returns {Array} - Liste des prochaines sorties
 */
function getUpcomingReleases() {
  const upcoming = [];
  const today = new Date();
  const todayIndex = today.getDay();
  const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayIndex = date.getDay();
    const dayKey = dayMap[dayIndex];
    
    const releases = FALLBACK_SCHEDULE[dayKey] || [];
    releases.forEach(release => {
      upcoming.push({
        ...release,
        releaseDate: new Date(date),
        formattedDate: formatDateFr(date),
        dayName: getDayNameFr(dayKey)
      });
    });
  }
  
  return upcoming.sort((a, b) => a.releaseDate - b.releaseDate);
}

// ============================================
// RECHERCHE DANS LE CALENDRIER
// ============================================

/**
 * Recherche une sortie par titre
 * @param {string} query - Terme de recherche
 * @returns {Array} - Résultats
 */
function searchInSchedule(query) {
  const allReleases = [];
  const searchTerm = query.toLowerCase();
  
  // Collectionner tous les animes
  Object.values(FALLBACK_SCHEDULE).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'anime' })));
  });
  
  // Collectionner tous les mangas
  Object.values(MANGA_SCHEDULE).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'manga' })));
  });
  
  // Collectionner tous les webtoons
  Object.values(WEBTOON_SCHEDULE).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'webtoon' })));
  });
  
  return allReleases.filter(release => 
    release.title.toLowerCase().includes(searchTerm)
  );
}

// ============================================
// SYNC AVEC API JIKAN
// ============================================

/**
 * Récupère le planning réel depuis l'API Jikan
 * @returns {Promise<Object>} - Planning mis à jour
 */
async function fetchRealSchedule() {
  const API_BASE = 'https://api.jikan.moe/v4';
  const CORS_PROXY = 'https://corsproxy.io/?url=';
  
  try {
    // Tentative directe
    let response = await fetch(`${API_BASE}/schedules`);
    if (!response.ok) throw new Error('Erreur réseau');
    
    const data = await response.json();
    const realSchedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
    
    if (data.data) {
      data.data.forEach(anime => {
        const day = anime.broadcast?.day?.toLowerCase();
        if (day && realSchedule[day]) {
          realSchedule[day].push({
            id: anime.mal_id,
            title: anime.title,
            episode: anime.episodes || '?',
            time: anime.broadcast?.time || 'Horaire inconnu',
            image: anime.images.jpg.image_url,
            type: 'anime',
            score: anime.score
          });
        }
      });
    }
    
    return realSchedule;
  } catch (error) {
    console.error('Erreur chargement planning réel:', error);
    return FALLBACK_SCHEDULE;
  }
}

/**
 * Met à jour le planning avec les données réelles
 */
async function updateScheduleFromAPI() {
  const realSchedule = await fetchRealSchedule();
  Object.assign(FALLBACK_SCHEDULE, realSchedule);
  return FALLBACK_SCHEDULE;
}

// ============================================
// NOTIFICATIONS DE SORTIES
// ============================================

/**
 * Vérifie les sorties du jour et envoie une notification
 */
async function checkTodayReleasesAndNotify() {
  const todayReleases = getTodayReleases();
  
  if (todayReleases.length > 0 && Notification.permission === 'granted') {
    new Notification('📺 Nouvelles sorties aujourd\'hui !', {
      body: `${todayReleases.length} nouvel${todayReleases.length > 1 ? 's' : ''} épisode${todayReleases.length > 1 ? 's' : ''} disponible${todayReleases.length > 1 ? 's' : ''}.`,
      icon: '/favicon.ico',
      tag: 'daily-releases'
    });
  }
}

// ============================================
// EXPORT DES FONCTIONS
// ============================================
window.CalendarData = {
  getWeekRange,
  formatDateFr,
  getDayNameFr,
  isReleasedToday,
  getTodayReleases,
  getTodayReleasesByType,
  getWeekReleases,
  getUpcomingReleases,
  searchInSchedule,
  fetchRealSchedule,
  updateScheduleFromAPI,
  checkTodayReleasesAndNotify,
  DAYS_FR,
  MONTHS_FR,
  FALLBACK_SCHEDULE
};

// Initialiser la mise à jour automatique
if (typeof window !== 'undefined') {
  // Mettre à jour le planning au chargement
  updateScheduleFromAPI();
  
  // Vérifier les sorties du jour (une fois par jour)
  const lastCheck = localStorage.getItem('lastReleasesCheck');
  const today = new Date().toDateString();
  if (lastCheck !== today) {
    setTimeout(() => checkTodayReleasesAndNotify(), 5000);
    localStorage.setItem('lastReleasesCheck', today);
  }
}

console.log('✅ calendar-data.js chargé');
