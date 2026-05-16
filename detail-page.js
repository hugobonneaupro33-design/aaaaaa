// Récupérer l'ID et le type depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const contentId = urlParams.get('id');
const contentType = window.location.pathname.includes('manga-detail') ? 'manga' : 'anime';

// Éléments DOM
const container = document.getElementById(`${contentType}DetailContainer`);

// Charger les détails
async function loadDetails() {
  if (!container) return;
  
  if (!contentId) {
    container.innerHTML = '<p class="error">❌ ID manquant</p>';
    return;
  }
  
  container.innerHTML = '<div class="loading">⏳ Chargement des détails...</div>';
  
  try {
    const response = await fetch(`https://api.jikan.moe/v4/${contentType}/${contentId}`);
    if (!response.ok) throw new Error('Erreur réseau');
    const data = await response.json();
    const item = data.data;
    
    // Formatage des dates
    let publishedFrom = 'Inconnue';
    let publishedTo = 'En cours';
    
    if (contentType === 'manga') {
      if (item.published?.from) {
        publishedFrom = new Date(item.published.from).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
      }
      if (item.published?.to) {
        publishedTo = new Date(item.published.to).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
      } else if (item.status === 'Finished') {
        publishedTo = 'Terminé';
      }
    }
    
    const title = item.title || 'Sans titre';
    const englishTitle = item.title_english || '';
    const score = item.score || 'N/A';
    const rank = item.rank || 'N/A';
    const favorites = item.favorites?.toLocaleString() || '0';
    const status = item.status || 'Inconnu';
    const genres = item.genres?.map(g => `<span class="genre-tag">${g.name}</span>`).join('') || 'Aucun';
    const synopsis = item.synopsis || 'Pas de synopsis disponible.';
    const imageUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || 'https://via.placeholder.com/300x450?text=Image+non+disponible';
    
    // Données spécifiques
    let volumes = 'N/A';
    let chapters = 'N/A';
    let authors = 'N/A';
    
    if (contentType === 'manga') {
      volumes = item.volumes || '?';
      chapters = item.chapters || '?';
      authors = item.authors?.map(a => a.name).join(', ') || 'Inconnu';
    } else {
      volumes = item.episodes || '?';
      chapters = item.duration || 'N/A';
      authors = item.studios?.map(s => s.name).join(', ') || 'Inconnu';
    }
    
    container.innerHTML = `
      <div class="detail-hero">
        <img src="${imageUrl}" alt="${title}">
        <div class="detail-hero-info">
          <h1>${title}</h1>
          ${englishTitle ? `<h2>${englishTitle}</h2>` : ''}
          <div class="detail-stats">
            <span class="stat">⭐ ${score}</span>
            <span class="stat">📊 Rang #${rank}</span>
            <span class="stat">❤️ Favoris : ${favorites}</span>
          </div>
        </div>
      </div>
      
      <div class="detail-info-grid">
        <div class="info-card">
          <h3>📅 Dates de publication</h3>
          <p><strong>Japon :</strong> ${publishedFrom}</p>
          <p><strong>France :</strong> À venir (consultez l'éditeur)</p>
          <p><strong>Statut :</strong> ${status}</p>
          ${contentType === 'manga' ? `<p><strong>Volumes :</strong> ${volumes}</p>` : ''}
        </div>
        
        <div class="info-card">
          <h3>${contentType === 'manga' ? '📚 Chapitres' : '📺 Épisodes'}</h3>
          <p><strong>${contentType === 'manga' ? 'Chapitres :' : 'Total :'}</strong> ${chapters}</p>
          <p><strong>${contentType === 'manga' ? 'Auteur(s) :' : 'Studio :'}</strong> ${authors}</p>
          ${contentType !== 'manga' ? `<p><strong>Durée :</strong> ${volumes}</p>` : ''}
        </div>
        
        <div class="info-card">
          <h3>🏷️ Genres</h3>
          <div class="genres-list">
            ${genres}
          </div>
        </div>
      </div>
      
      <div class="synopsis-full">
        <h3>📖 Synopsis</h3>
        <p>${synopsis}</p>
      </div>
    `;
    
    // Si utilisateur connecté, charger ses préférences
    if (currentUser && document.getElementById('userActions')) {
      document.getElementById('userActions').classList.remove('hidden');
      await loadUserContentData(contentId);
    }
    
  } catch (error) {
    console.error('Erreur:', error);
    container.innerHTML = '<div class="error">❌ Erreur lors du chargement des détails. Vérifie ta connexion.</div>';
  }
}

// Charger les données utilisateur
async function loadUserContentData(contentId) {
  if (!currentUser) return;
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : { 
      watched: [], 
      read: [],
      likes: [], 
      ratings: {} 
    };
    
    const actionKey = contentType === 'manga' ? 'read' : 'watched';
    const actionBtn = document.getElementById('markReadBtn') || document.getElementById('markWatchedBtn');
    
    if (actionBtn) {
      if (userData[actionKey] && userData[actionKey].includes(contentId)) {
        actionBtn.classList.add('active');
        actionBtn.textContent = contentType === 'manga' ? '✅ Lu' : '✅ Vu';
      }
    }
    
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn && userData.likes && userData.likes.includes(contentId)) {
      likeBtn.classList.add('active');
      likeBtn.textContent = '❤️ Liké';
    }
    
    const ratingSelect = document.getElementById('userRating');
    if (ratingSelect && userData.ratings && userData.ratings[contentId]) {
      ratingSelect.value = userData.ratings[contentId];
    }
  } catch (error) {
    console.error('Erreur chargement préférences:', error);
  }
}

// Sauvegarder dans Firestore
async function saveUserContentData(action, contentId) {
  if (!currentUser) {
    alert('🔐 Connectez-vous pour sauvegarder vos préférences !');
    return;
  }
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const userDoc = await userRef.get();
    let userData = userDoc.exists ? userDoc.data() : { 
      watched: [], 
      read: [],
      likes: [], 
      ratings: {} 
    };
    
    const actionKey = contentType === 'manga' ? 'read' : 'watched';
    const actionBtn = document.getElementById('markReadBtn') || document.getElementById('markWatchedBtn');
    const likeBtn = document.getElementById('likeBtn');
    
    switch(action) {
      case 'read':
      case 'watched':
        if (userData[actionKey] && userData[actionKey].includes(contentId)) {
          userData[actionKey] = userData[actionKey].filter(id => id !== contentId);
          if (actionBtn) {
            actionBtn.classList.remove('active');
            actionBtn.textContent = contentType === 'manga' ? '📖 Marquer comme lu' : '👁️ Marquer comme vu';
          }
        } else {
          userData[actionKey] = [...(userData[actionKey] || []), contentId];
          if (actionBtn) {
            actionBtn.classList.add('active');
            actionBtn.textContent = contentType === 'manga' ? '✅ Lu' : '✅ Vu';
          }
        }
        break;
        
      case 'like':
        if (userData.likes && userData.likes.includes(contentId)) {
          userData.likes = userData.likes.filter(id => id !== contentId);
          if (likeBtn) {
            likeBtn.classList.remove('active');
            likeBtn.textContent = '❤️ Liker';
          }
        } else {
          userData.likes = [...(userData.likes || []), contentId];
          if (likeBtn) {
            likeBtn.classList.add('active');
            likeBtn.textContent = '❤️ Liké';
          }
        }
        break;
        
      case 'rating':
        const rating = document.getElementById('userRating').value;
        userData.ratings = { ...userData.ratings, [contentId]: rating };
        break;
    }
    
    await userRef.set(userData);
    
    // Afficher un petit message de confirmation
    showToast('✅ Préférence sauvegardée !');
    
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
    showToast('❌ Erreur lors de la sauvegarde', 'error');
  }
}

// Notification toast
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadDetails();
  
  const actionBtn = document.getElementById('markReadBtn') || document.getElementById('markWatchedBtn');
  const likeBtn = document.getElementById('likeBtn');
  const ratingSelect = document.getElementById('userRating');
  
  if (actionBtn) {
    const action = contentType === 'manga' ? 'read' : 'watched';
    actionBtn.addEventListener('click', () => saveUserContentData(action, contentId));
  }
  
  if (likeBtn) {
    likeBtn.addEventListener('click', () => saveUserContentData('like', contentId));
  }
  
  if (ratingSelect) {
    ratingSelect.addEventListener('change', () => saveUserContentData('rating', contentId));
  }
});
