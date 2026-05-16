// ============================================
// CALENDAR.JS - GESTION DU CALENDRIER DES SORTIES
// Anime & Manga Info - Planning hebdomadaire
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const ANILIST_API = 'https://graphql.anilist.co';

let currentWeekOffset = 0;
let currentView = 'anime'; // anime, manga, webtoon
let calendarData = null;
let isLoading = false;

// Jours de la semaine en français
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
const DAYS_FR_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Mois en français
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

// ============================================
// REQUÊTES GRAPHQL
// ============================================

// Requête pour les animes diffusés cette semaine
const WEEK_SCHEDULE_QUERY = `
  query ($startDate: Int, $endDate: Int) {
    Page(page: 1, perPage: 100) {
      media(type: ANIME, startDate_greater: $startDate, startDate_lesser: $endDate, sort: START_DATE) {
        id
        title { romaji english }
        coverImage { medium }
        startDate { year month day }
        nextAiringEpisode { episode airingAt }
        format
        status
        episodes
        averageScore
      }
    }
  }
`;

// Requête pour les animes tendances
const TRENDING_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id
        title { romaji english }
        coverImage { medium }
        averageScore
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

// Requête pour les animes populaires
const POPULAR_QUERY = `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id
        title { romaji english }
        coverImage { medium }
        averageScore
        favourites
      }
    }
  }
`;

// ============================================
// FONCTIONS DE DATE
// ============================================

/**
 * Obtient la semaine actuelle (début et fin)
 * @param {Date} date - Date de référence
 * @param {number} offset - Décalage en semaines
 * @returns {Object} - { start, end, startTimestamp, endTimestamp }
 */
function getWeekRange(date = new Date(), offset = 0) {
  const currentDate = new Date(date);
  currentDate.setDate(currentDate.getDate() + (offset * 7));
  
  const dayOfWeek = currentDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return {
    start,
    end,
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: Math.floor(end.getTime() / 1000)
  };
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
 * Formate une date pour l'affichage (ex: "15 Janvier 2025")
 * @param {Object} dateObj - Objet date { year, month, day }
 * @returns {string}
 */
function formatAnilistDate(dateObj) {
  if (!dateObj || !dateObj.year) return 'Date inconnue';
  const date = new Date(dateObj.year, (dateObj.month || 1) - 1, dateObj.day || 1);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Obtient le nom du jour en français à partir d'une date
 * @param {Date} date - Date
 * @returns {string}
 */
function getDayNameFromDate(date) {
  const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return days[date.getDay()];
}

// ============================================
// RÉCUPÉRATION DES DONNÉES
// ============================================

/**
 * Fetche les données depuis l'API AniList
 * @param {string} query - Requête GraphQL
 * @param {Object} variables - Variables
 * @returns {Promise<Object>}
 */
async function fetchAnilist(query, variables) {
  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    const data = await response.json();
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      return null;
    }
    return data.data;
  } catch (error) {
    console.error('Erreur fetch AniList:', error);
    return null;
  }
}

/**
 * Récupère les sorties de la semaine
 * @param {number} weekOffset - Décalage de semaine
 * @returns {Promise<Object>}
 */
async function fetchWeekSchedule(weekOffset = 0) {
  const { startTimestamp, endTimestamp } = getWeekRange(new Date(), weekOffset);
  
  const data = await fetchAnilist(WEEK_SCHEDULE_QUERY, {
    startDate: startTimestamp,
    endDate: endTimestamp
  });
  
  if (data?.Page?.media) {
    return organizeScheduleByDay(data.Page.media);
  }
  return {};
}

/**
 * Organise les sorties par jour de la semaine
 * @param {Array} media - Liste des médias
 * @returns {Object}
 */
function organizeScheduleByDay(media) {
  const schedule = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  
  media.forEach(anime => {
    let dayKey = null;
    
    // Vérifier via nextAiringEpisode
    if (anime.nextAiringEpisode) {
      const airingDate = new Date(anime.nextAiringEpisode.airingAt * 1000);
      const dayName = getDayNameFromDate(airingDate);
      dayKey = dayName;
    }
    // Vérifier via startDate
    else if (anime.startDate?.year) {
      const releaseDate = new Date(
        anime.startDate.year,
        (anime.startDate.month || 1) - 1,
        anime.startDate.day || 1
      );
      const dayName = getDayNameFromDate(releaseDate);
      dayKey = dayName;
    }
    
    if (dayKey && schedule[dayKey]) {
      schedule[dayKey].push({
        ...anime,
        releaseInfo: getReleaseInfo(anime)
      });
    }
  });
  
  // Trier chaque jour par heure de diffusion
  for (const day in schedule) {
    schedule[day].sort((a, b) => {
      const timeA = a.nextAiringEpisode?.airingAt || Infinity;
      const timeB = b.nextAiringEpisode?.airingAt || Infinity;
      return timeA - timeB;
    });
  }
  
  return schedule;
}

/**
 * Obtient les informations de sortie pour un anime
 * @param {Object} anime - Anime object
 * @returns {string}
 */
function getReleaseInfo(anime) {
  if (anime.nextAiringEpisode) {
    const date = new Date(anime.nextAiringEpisode.airingAt * 1000);
    return `Ép. ${anime.nextAiringEpisode.episode} - ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (anime.startDate?.year) {
    return `Sortie: ${formatAnilistDate(anime.startDate)}`;
  }
  return 'Date inconnue';
}

// ============================================
// AFFICHAGE DU CALENDRIER
// ============================================

/**
 * Rendu du calendrier
 * @param {Object} schedule - Planning des sorties
 * @param {number} weekOffset - Décalage de semaine
 */
function renderCalendar(schedule, weekOffset = 0) {
  const calendarGrid = document.getElementById('calendarGrid');
  const weekDaysContainer = document.getElementById('weekDays');
  const calendarTitle = document.getElementById('calendarTitle');
  
  if (!calendarGrid) return;
  
  const { start, end } = getWeekRange(new Date(), weekOffset);
  const weekDates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    weekDates.push(date);
  }
  
  // Mettre à jour le titre
  if (calendarTitle) {
    calendarTitle.innerHTML = `📅 Semaine du ${formatDateFr(start)} au ${formatDateFr(end)}`;
  }
  
  // Afficher les jours de la semaine avec les dates
  if (weekDaysContainer) {
    weekDaysContainer.innerHTML = DAYS_FR_ORDER.map((day, index) => `
      <div class="calendar-day-header">
        ${day}<br>
        <small>${weekDates[index].getDate()} ${MONTHS_FR[weekDates[index].getMonth()]}</small>
      </div>
    `).join('');
  }
  
  // Remplir la grille
  calendarGrid.innerHTML = DAYS_ORDER.map(day => {
    const releases = schedule[day] || [];
    const dayDate = weekDates[DAYS_ORDER.indexOf(day)];
    
    return `
      <div class="calendar-day">
        <div class="calendar-day-date">
          ${DAYS_FR[day]}<br>
          <small>${dayDate.getDate()} ${MONTHS_FR[dayDate.getMonth()]}</small>
        </div>
        <div class="calendar-releases">
          ${releases.map(anime => `
            <div class="calendar-episode" data-id="${anime.id}">
              <strong>${anime.title?.romaji?.substring(0, 25) || '?'}</strong>
              <small>${anime.releaseInfo}</small>
              ${anime.averageScore ? `<span class="calendar-score">⭐ ${(anime.averageScore / 10).toFixed(1)}</span>` : ''}
            </div>
          `).join('')}
          ${releases.length === 0 ? '<div class="calendar-empty">Aucune sortie</div>' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Ajouter les événements de clic
  document.querySelectorAll('.calendar-episode').forEach(ep => {
    ep.addEventListener('click', () => {
      const id = ep.dataset.id;
      if (id) window.location.href = `anime-detail.html?id=${id}`;
    });
  });
}

// ============================================
// CHARGEMENT DU CALENDRIER
// ============================================

/**
 * Charge et affiche le calendrier
 * @param {number} weekOffset - Décalage de semaine
 */
async function loadCalendar(weekOffset = 0) {
  if (isLoading) return;
  isLoading = true;
  
  const calendarGrid = document.getElementById('calendarGrid');
  if (calendarGrid) {
    calendarGrid.innerHTML = '<div class="loading">⏳ Chargement du calendrier...</div>';
  }
  
  try {
    const schedule = await fetchWeekSchedule(weekOffset);
    renderCalendar(schedule, weekOffset);
    currentWeekOffset = weekOffset;
  } catch (error) {
    console.error('Erreur chargement calendrier:', error);
    if (calendarGrid) {
      calendarGrid.innerHTML = '<div class="error">❌ Erreur de chargement du calendrier</div>';
    }
  } finally {
    isLoading = false;
  }
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Semaine précédente
 */
function prevWeek() {
  loadCalendar(currentWeekOffset - 1);
}

/**
 * Semaine suivante
 */
function nextWeek() {
  loadCalendar(currentWeekOffset + 1);
}

/**
 * Semaine actuelle
 */
function currentWeek() {
  loadCalendar(0);
}

// ============================================
// CALENDRIER DES SORTIES (ALTERNATIF)
// ============================================

/**
 * Récupère les sorties du jour
 * @returns {Promise<Array>}
 */
async function getTodayReleases() {
  const { startTimestamp, endTimestamp } = getWeekRange(new Date(), 0);
  const today = new Date();
  const todayDay = getDayNameFromDate(today);
  
  const schedule = await fetchWeekSchedule(0);
  return schedule[todayDay] || [];
}

/**
 * Récupère les prochaines sorties (7 jours)
 * @returns {Promise<Array>}
 */
async function getUpcomingReleases() {
  const schedule = await fetchWeekSchedule(0);
  const allReleases = [];
  
  for (const day of DAYS_ORDER) {
    const releases = schedule[day] || [];
    allReleases.push(...releases);
  }
  
  return allReleases.sort((a, b) => {
    const timeA = a.nextAiringEpisode?.airingAt || Infinity;
    const timeB = b.nextAiringEpisode?.airingAt || Infinity;
    return timeA - timeB;
  });
}

// ============================================
// TENDANCES ET POPULAIRES
// ============================================

/**
 * Récupère les animes tendances
 * @param {number} limit - Nombre d'animes
 * @returns {Promise<Array>}
 */
async function getTrendingAnime(limit = 12) {
  const data = await fetchAnilist(TRENDING_QUERY, { page: 1, perPage: limit });
  return data?.Page?.media || [];
}

/**
 * Récupère les animes populaires
 * @param {number} limit - Nombre d'animes
 * @returns {Promise<Array>}
 */
async function getPopularAnime(limit = 12) {
  const data = await fetchAnilist(POPULAR_QUERY, { page: 1, perPage: limit });
  return data?.Page?.media || [];
}

// ============================================
// INITIALISATION
// ============================================
function initCalendar() {
  // Écouteurs pour les boutons de navigation
  const prevBtn = document.getElementById('prevWeekBtn');
  const nextBtn = document.getElementById('nextWeekBtn');
  const currentBtn = document.getElementById('currentWeekBtn');
  
  if (prevBtn) prevBtn.addEventListener('click', () => prevWeek());
  if (nextBtn) nextBtn.addEventListener('click', () => nextWeek());
  if (currentBtn) currentBtn.addEventListener('click', () => currentWeek());
  
  // Charger le calendrier initial
  loadCalendar(0);
}

// Auto-initialisation si la page contient les éléments du calendrier
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendarGrid')) {
      initCalendar();
    }
  });
} else {
  if (document.getElementById('calendarGrid')) {
    initCalendar();
  }
}

// ============================================
// EXPORT (pour utilisation dans d'autres scripts)
// ============================================
window.Calendar = {
  loadCalendar,
  prevWeek,
  nextWeek,
  currentWeek,
  getTodayReleases,
  getUpcomingReleases,
  getTrendingAnime,
  getPopularAnime,
  fetchWeekSchedule,
  DAYS_FR,
  MONTHS_FR
};

console.log('✅ calendar.js chargé');
