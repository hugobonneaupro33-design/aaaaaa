// Récupérer l'ID depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const animeId = urlParams.get('id');
const type = urlParams.get('type') || 'anime';

// Charger les détails
async function loadAnimeDetails() {
  const container = document.getElementById('animeDetailContainer');
  if (!animeId) {
    container.innerHTML = '<p class="error">ID d\'anime manquant</p>';
    return;
  }
  
  container.innerHTML = '<div class="loading">⏳ Chargement...</div>';
  
  try {
    const response = await fetch(`https://api.jikan.moe/v4/${type}/${animeId}`);
    const data = await response.json();
    const item = data.data;
    
    // Formatage des dates
    const airedFrom = item.aired?.from ? new Date(item.aired.from).toLocaleDateString('fr-FR') : 'Inconnue';
    const airedTo = item.aired?.to ? new Date(item.aired.to).toLocaleDateString('fr-FR') : 'En cours';
    
    container.innerHTML = `
      <div class="detail-hero">
        <img src="${item.images?.jpg?.large_image_url || ''}" alt="${item.title}">
        <div class="detail-hero-info">
          <h1>${item.title}</h1>
          <h2>${item.title_english || ''}</h2>
          <div class="detail-stats">
            <span class="stat">⭐ ${item.score || 'N/A'}</span>
            <span class="stat">📊 Rang #${item.rank || 'N/A'}</span>
            <span class="stat">❤️ Favoris : ${item.favorites?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-info-grid">
        <div class="info-card">
          <h3>📅 Dates de sortie</h3>
          <p><strong>Japon :</strong> ${airedFrom}</p>
          <p><strong>France :</strong> À venir (consultez ADN/Crunchyroll)</p>
          <p><strong>Statut :</strong> ${item.status || 'Inconnu'}</p>
        </div>
        
        <div class="info-card">
          <h3>📺 Épisodes</h3>
          <p><strong>Total :</strong> ${item.episodes || '?'} épisodes</p>
          <p><strong>Durée :</strong> ${item.duration || 'N/A'}</p>
          <p><strong>Studio :</strong> ${item.studios?.map(s => s.name).join(', ') || 'N/A'}</p>
        </div>
        
        <div class="info-card">
          <h3>🏷️ Genres</h3>
          <div class="genres-list">
            ${item.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || 'Aucun'}
          </div>
        </div>
      </div>
      
      <div class="synopsis-full">
        <h3>📖 Synopsis</h3>
        <p>${item.synopsis || 'Pas de synopsis disponible.'}</p>
      </div>
    `;
    
    // Si utilisateur connecté, charger ses préférences pour cet anime
    if (currentUser) {
      document.getElementById('userActions').classList.remove('hidden');
      await loadUserAnimeData(animeId);
    }
    
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="error">❌ Erreur lors du chargement</p>';
  }
}

// Charger les données utilisateur pour cet anime
async function loadUserAnimeData(animeId) {
  if (!currentUser) return;
  
  const userRef = db.collection('users').doc(currentUser.uid);
  const userDoc = await userRef.get();
  const userData = userDoc.exists ? userDoc.data() : { watched: [], likes: [], ratings: {} };
  
  // Marquer le bouton "vu" si déjà dans la liste
  const watchedBtn = document.getElementById('markWatchedBtn');
  if (userData.watched && userData.watched.includes(animeId)) {
    watchedBtn.classList.add('active');
    watchedBtn.textContent = '✅ Vu';
  }
  
  // Marquer le like
  const likeBtn = document.getElementById('likeBtn');
  if (userData.likes && userData.likes.includes(animeId)) {
    likeBtn.classList.add('active');
    likeBtn.textContent = '❤️ Liké';
  }
  
  // Restaurer la note
  const ratingSelect = document.getElementById('userRating');
  if (userData.ratings && userData.ratings[animeId]) {
    ratingSelect.value = userData.ratings[animeId];
  }
}

// Sauvegarder dans Firestore
async function saveUserAnimeData(action, animeId) {
  if (!currentUser) {
    alert('Connectez-vous pour sauvegarder vos préférences !');
    return;
  }
  
  const userRef = db.collection('users').doc(currentUser.uid);
  const userDoc = await userRef.get();
  let userData = userDoc.exists ? userDoc.data() : { watched: [], likes: [], ratings: {} };
  
  switch(action) {
    case 'watched':
      if (userData.watched && userData.watched.includes(animeId)) {
        userData.watched = userData.watched.filter(id => id !== animeId);
        document.getElementById('markWatchedBtn').classList.remove('active');
        document.getElementById('markWatchedBtn').textContent = '👁️ Marquer comme vu';
      } else {
        userData.watched = [...(userData.watched || []), animeId];
        document.getElementById('markWatchedBtn').classList.add('active');
        document.getElementById('markWatchedBtn').textContent = '✅ Vu';
      }
      break;
      
    case 'like':
      if (userData.likes && userData.likes.includes(animeId)) {
        userData.likes = userData.likes.filter(id => id !== animeId);
        document.getElementById('likeBtn').classList.remove('active');
        document.getElementById('likeBtn').textContent = '❤️ Liker';
      } else {
        userData.likes = [...(userData.likes || []), animeId];
        document.getElementById('likeBtn').classList.add('active');
        document.getElementById('likeBtn').textContent = '❤️ Liké';
      }
      break;
      
    case 'rating':
      const rating = document.getElementById('userRating').value;
      userData.ratings = { ...userData.ratings, [animeId]: rating };
      break;
  }
  
  await userRef.set(userData);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadAnimeDetails();
  
  document.getElementById('markWatchedBtn')?.addEventListener('click', () => saveUserAnimeData('watched', animeId));
  document.getElementById('likeBtn')?.addEventListener('click', () => saveUserAnimeData('like', animeId));
  document.getElementById('userRating')?.addEventListener('change', () => saveUserAnimeData('rating', animeId));
});
