// Sorties simulées par jour de la semaine (à remplacer par API réelle)
const weeklySchedule = {
  monday: [
    { id: 1, title: "One Piece", episode: 1122, time: "09:30", image: "https://cdn.myanimelist.net/images/anime/6/73245.jpg", type: "anime", lang: { vf: true, vostfr: true } },
    { id: 2, title: "Black Clover", episode: 170, time: "10:00", image: "https://cdn.myanimelist.net/images/anime/2/76014.jpg", type: "anime", lang: { vf: false, vostfr: true } }
  ],
  tuesday: [
    { id: 3, title: "Jujutsu Kaisen", episode: 47, time: "11:00", image: "https://cdn.myanimelist.net/images/anime/1171/109222.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  wednesday: [
    { id: 4, title: "Demon Slayer", episode: 55, time: "10:30", image: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  thursday: [
    { id: 5, title: "My Hero Academia", episode: 138, time: "09:00", image: "https://cdn.myanimelist.net/images/anime/10/78745.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  friday: [
    { id: 6, title: "Attack on Titan", episode: 87, time: "08:00", image: "https://cdn.myanimelist.net/images/anime/10/47347.jpg", type: "anime", lang: { vf: false, vostfr: true } }
  ],
  saturday: [
    { id: 7, title: "Boruto", episode: 293, time: "11:30", image: "https://cdn.myanimelist.net/images/anime/9/78917.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ],
  sunday: [
    { id: 8, title: "Dragon Ball Daima", episode: 12, time: "10:00", image: "https://cdn.myanimelist.net/images/anime/1947/144122.jpg", type: "anime", lang: { vf: true, vostfr: true } }
  ]
};

// Fonction pour obtenir les sorties du jour
function getTodayReleases() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  return weeklySchedule[today] || [];
}

// Fonction pour obtenir les sorties d'une semaine spécifique
function getWeekReleases(startDate) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekReleases = {};
  
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dayName = days[i];
    weekReleases[dayName] = weeklySchedule[dayName] || [];
  }
  
  return weekReleases;
}

// Obtenir les dates de début/fin de semaine
function getWeekRange(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return { start, end };
}
