// Sorties simulées par jour de la semaine (à remplacer par API réelle)
const weeklySchedule = {
  monday: [
    { id: 1, title: "One Piece", episode: 1122, title_episode: "Le début du nouveau chapitre", time: "09:30", image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 2, title: "Black Clover", episode: 170, title_episode: "Le magicien suprême", time: "10:00", image: "https://cdn.myanimelist.net/images/anime/2/76014.jpg", type: "anime", lang: { vf: false, vostfr: true } },
    { id: 21, title: "Tower of God", episode: 25, title_episode: "La tour des mensonges", time: "11:30", image: "https://cdn.myanimelist.net/images/anime/1413/119682.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  tuesday: [
    { id: 3, title: "Jujutsu Kaisen", episode: 47, title_episode: "La nuit des sorts", time: "11:00", image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 22, title: "Solo Leveling", episode: 24, title_episode: "L'ombre du monarque", time: "12:00", image: "https://cdn.myanimelist.net/images/anime/1369/138315.jpg", type: "anime", lang: { vf: false, vostfr: true } }
  ],
  wednesday: [
    { id: 4, title: "Demon Slayer", episode: 55, title_episode: "L'entraînement des piliers", time: "10:30", image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 23, title: "Blue Lock", episode: 38, title_episode: "Le but suprême", time: "13:00", image: "https://cdn.myanimelist.net/images/anime/1254/136259.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  thursday: [
    { id: 5, title: "My Hero Academia", episode: 138, title_episode: "Le héros ultime", time: "09:00", image: "https://cdn.myanimelist.net/images/anime/10/78745.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 24, title: "Chainsaw Man", episode: 13, title_episode: "Le bruit du moteur", time: "14:00", image: "https://cdn.myanimelist.net/images/anime/1806/126216.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  friday: [
    { id: 6, title: "Attack on Titan", episode: 87, title_episode: "La chute finale", time: "08:00", image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", type: "anime", lang: { vf: false, vostfr: true } },
    { id: 25, title: "Spy x Family", episode: 37, title_episode: "Mission secrète", time: "11:00", image: "https://cdn.myanimelist.net/images/anime/1385/119657.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  saturday: [
    { id: 7, title: "Boruto", episode: 293, title_episode: "L'héritage de Naruto", time: "11:30", image: "https://cdn.myanimelist.net/images/anime/9/78917.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 26, title: "Frieren", episode: 28, title_episode: "Le voyage continue", time: "09:00", image: "https://cdn.myanimelist.net/images/anime/1375/143179.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  sunday: [
    { id: 8, title: "Dragon Ball Daima", episode: 12, title_episode: "Le mystère de Namek", time: "10:00", image: "https://cdn.myanimelist.net/images/anime/1947/144122.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 27, title: "One Punch Man", episode: 25, title_episode: "Le retour du héros", time: "15:00", image: "https://cdn.myanimelist.net/images/anime/1235/145046.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ]
};

// Données de mangas par jour
const mangaSchedule = {
  monday: [
    { id: 101, title: "One Piece", chapter: 1125, title_chapter: "La volonté du D", time: "10:00", image: "https://cdn.myanimelist.net/images/manga/1/10.jpg", type: "manga" },
    { id: 102, title: "My Hero Academia", chapter: 398, title_chapter: "L'ultime combat", time: "11:00", image: "https://cdn.myanimelist.net/images/manga/3/205975.jpg", type: "manga" }
  ],
  wednesday: [
    { id: 103, title: "Jujutsu Kaisen", chapter: 255, title_chapter: "La confrontation", time: "11:00", image: "https://cdn.myanimelist.net/images/manga/3/196750.jpg", type: "manga" }
  ],
  friday: [
    { id: 104, title: "Demon Slayer", chapter: 204, title_chapter: "L'héritage", time: "12:00", image: "https://cdn.myanimelist.net/images/manga/1/197476.jpg", type: "manga" }
  ],
  sunday: [
    { id: 105, title: "Boruto", chapter: 80, title_chapter: "Le nouveau chapitre", time: "09:00", image: "https://cdn.myanimelist.net/images/manga/3/192797.jpg", type: "manga" }
  ]
};

// Données de webtoons par jour
const webtoonSchedule = {
  thursday: [
    { id: 201, title: "Tower of God", chapter: 600, title_chapter: "La guerre des familles", time: "14:00", image: "https://cdn.myanimelist.net/images/manga/2/165032.jpg", type: "webtoon" }
  ],
  saturday: [
    { id: 202, title: "Solo Leveling", chapter: 179, title_chapter: "Le monarque des ombres", time: "15:00", image: "https://cdn.myanimelist.net/images/manga/2/209195.jpg", type: "webtoon" }
  ]
};

// Noms des jours en français
const dayNamesFr = {
  monday: 'Lundi',
  tuesday: 'Mardi',
  wednesday: 'Mercredi',
  thursday: 'Jeudi',
  friday: 'Vendredi',
  saturday: 'Samedi',
  sunday: 'Dimanche'
};

// Ordre des jours pour l'affichage
const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Fonction pour obtenir les sorties du jour (tous types)
function getTodayReleases() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const animeReleases = weeklySchedule[today] || [];
  const mangaReleases = mangaSchedule[today] || [];
  const webtoonReleases = webtoonSchedule[today] || [];
  
  return [...animeReleases, ...mangaReleases, ...webtoonReleases];
}

// Fonction pour obtenir les sorties du jour (par type)
function getTodayReleasesByType(type) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  
  switch(type) {
    case 'anime': return weeklySchedule[today] || [];
    case 'manga': return mangaSchedule[today] || [];
    case 'webtoon': return webtoonSchedule[today] || [];
    default: return [];
  }
}

// Fonction pour obtenir toutes les sorties d'une semaine
function getWeekReleases(startDate) {
  const weekReleases = {};
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dayName = daysOrder[i];
    
    weekReleases[dayName] = {
      anime: weeklySchedule[dayName] || [],
      manga: mangaSchedule[dayName] || [],
      webtoon: webtoonSchedule[dayName] || [],
      date: new Date(currentDate)
    };
  }
  
  return weekReleases;
}

// Obtenir les dates de début/fin de semaine
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

// Formater une date en français
function formatDateFr(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

// Obtenir le nom du jour en français
function getDayNameFr(dayKey) {
  return dayNamesFr[dayKey] || dayKey;
}

// Vérifier si une sortie est aujourd'hui
function isReleasedToday(releaseDate) {
  const today = new Date();
  return releaseDate.getDate() === today.getDate() &&
         releaseDate.getMonth() === today.getMonth() &&
         releaseDate.getFullYear() === today.getFullYear();
}

// Obtenir les prochaines sorties (7 jours)
function getUpcomingReleases() {
  const upcoming = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayName = daysOrder[date.getDay() === 0 ? 6 : date.getDay() - 1];
    
    const releases = weeklySchedule[dayName] || [];
    releases.forEach(release => {
      upcoming.push({
        ...release,
        releaseDate: new Date(date),
        formattedDate: formatDateFr(date)
      });
    });
  }
  
  // Trier par date
  return upcoming.sort((a, b) => a.releaseDate - b.releaseDate);
}

// Rechercher une sortie par titre
function searchRelease(query) {
  const allReleases = [];
  
  // Collectionner tous les animes
  Object.values(weeklySchedule).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'anime' })));
  });
  
  // Collectionner tous les mangas
  Object.values(mangaSchedule).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'manga' })));
  });
  
  // Collectionner tous les webtoons
  Object.values(webtoonSchedule).forEach(dayReleases => {
    allReleases.push(...dayReleases.map(r => ({ ...r, category: 'webtoon' })));
  });
  
  const searchTerm = query.toLowerCase();
  return allReleases.filter(release => 
    release.title.toLowerCase().includes(searchTerm)
  );
}

// Export des fonctions (pour utilisation globale)
window.getTodayReleases = getTodayReleases;
window.getTodayReleasesByType = getTodayReleasesByType;
window.getWeekReleases = getWeekReleases;
window.getWeekRange = getWeekRange;
window.formatDateFr = formatDateFr;
window.getDayNameFr = getDayNameFr;
window.isReleasedToday = isReleasedToday;
window.getUpcomingReleases = getUpcomingReleases;
window.searchRelease = searchRelease;
window.weeklySchedule = weeklySchedule;
window.mangaSchedule = mangaSchedule;
window.webtoonSchedule = webtoonSchedule;
window.daysOrder = daysOrder;
window.dayNamesFr = dayNamesFr;

console.log('📅 Calendrier chargé avec succès');
