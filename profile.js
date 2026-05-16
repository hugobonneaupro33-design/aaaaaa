const profileContent = document.getElementById('profileContent');

// Charger le profil utilisateur
async function loadProfile() {
  if (!currentUser) {
    profileContent.innerHTML = `
      <div class="error">
        ❓ Vous n'êtes pas connecté<br><br>
        <button onclick="loginWithGoogle()" class="google-btn">🔵 Se connecter avec Google</button>
        <button onclick="loginWithFacebook()" class="facebook-btn" style="margin-left: 1rem;">📘 Se connecter avec Facebook</button>
      </div>
    `;
    return;
  }
  
  profileContent.innerHTML = '<div class="loading">⏳ Chargement de vos données...</div>';
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : { 
      watched: [], 
      read: [],
      likes: [], 
      ratings: {} 
    };
    
    const watchedList = userData.watched || [];
    const readList = userData.read || [];
    const likesList = userData.likes || [];
    const ratings = userData.ratings || {};
    
    // Compter les notes
    const ratedCount = Object.keys(ratings).filter(id => ratings[id] > 0).length;
    
    // Récupérer les détails des animes likés
    let likedItemsHtml = '';
    if (likesList.length > 0) {
      const animePromises = likesList.filter(id => id).map(async (id) => {
        try {
          const response = await fetch(`https://api.jikan.moe/v4/anime/${id}`);
          const data = await response.json();
          return data.data;
        } catch {
          return null;
        }
      });
      
      const mangaPromises = likesList.filter(id => id).map(async (id) => {
        try {
          const response = await fetch(`https://api.jikan.moe/v4/manga/${id}`);
          const data = await response.json();
          return data.data;
        } catch {
          return null;
        }
      });
      
      const animeResults = await Promise.all(animePromises);
      const mangaResults = await Promise.all(mangaPromises);
      const allLiked = [...animeResults, ...mangaResults].filter(item => item);
      
      likedItemsHtml = `
        <div class="likes-grid">
          ${allLiked.map(item => `
            <div class="like-item" onclick="window.location.href='${item.type === 'manga' ? 'manga-detail.html' : 'anime-detail.html'}?id=${item.mal_id}'">
              <img src="${item.images?.jpg?.image_url || 'https://via.placeholder.com/150x200'}" alt="${item.title}">
              <p style="margin-top: 0.5rem; font-size: 0.8rem;">${item.title}</p>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      likedItemsHtml = '<p style="color: #888;">Aucun like pour le moment. Commencez à liker des animes/mangas !</p>';
    }
    
    profileContent.innerHTML = `
      <div class="profile-header">
        <img src="${currentUser.photoURL || 'https://via.placeholder.com/100'}" class="profile-avatar" alt="Avatar">
        <h2>${currentUser.displayName || currentUser.email}</h2>
        <p>${currentUser.email}</p>
      </div>
      
      <div class="profile-stats">
        <div class="stat-card">
          <div class="stat-number">${watchedList.length}</div>
          <div>Animes vus</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${readList.length}</div>
          <div>Mangas lus</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${likesList.length}</div>
          <div>Favoris</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${ratedCount}</div>
          <div>Notés</div>
        </div>
      </div>
      
      <div class="profile-section">
        <h3>❤️ Mes favoris (${likesList.length})</h3>
        ${likedItemsHtml}
      </div>
      
      <div class="profile-section">
        <h3>📈 Statistiques détaillées</h3>
        <p><strong>Animes vus :</strong> ${watchedList.length}</p>
        <p><strong>Mangas lus :</strong> ${readList.length}</p>
        <p><strong>Total favoris :</strong> ${likesList.length}</p>
        <p><strong>Note moyenne donnée :</strong>
