// ============================================
// CONFIGURATION FIREBASE - ARKYA ANIMEMANGA
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCwDOGPUWQ08WGuAAZ9p6hS6SZytmRoKig",
  authDomain: "arkya-animemanga.firebaseapp.com",
  projectId: "arkya-animemanga",
  storageBucket: "arkya-animemanga.firebasestorage.app",
  messagingSenderId: "52570519836",
  appId: "1:52570519836:web:dbf4fcd7aafe01aac762d9",
  measurementId: "G-04DPK4LP4H"
};

// ============================================
// INITIALISATION FIREBASE
// ============================================
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
let db = null;

// Initialiser Firestore (optionnel)
try {
  db = firebase.firestore();
  console.log('✅ Firestore initialisé');
} catch (e) {
  console.warn('⚠️ Firestore non disponible:', e);
}

// ============================================
// FOURNISSEURS D'AUTHENTIFICATION
// ============================================
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Configuration Google
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Configuration Facebook
facebookProvider.setCustomParameters({
  display: 'popup'
});

// ============================================
// ÉTAT UTILISATEUR
// ============================================
let currentUser = null;
let authInitialized = false;

// Observer les changements de connexion
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  authInitialized = true;
  
  // Mettre à jour l'interface
  updateUIBasedOnAuth();
  
  // Déclencher un événement personnalisé pour les autres scripts
  const event = new CustomEvent('authChanged', { detail: user });
  document.dispatchEvent(event);
  
  // Sauvegarder la session
  if (user) {
    sessionStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }));
    
    // Mettre à jour Firestore
    if (db) {
      try {
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
          loginCount: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      } catch (e) {
        console.warn('⚠️ Firestore update:', e);
      }
    }
    
    // Notification de bienvenue
    setTimeout(() => {
      showToast(`✨ Bienvenue ${user.displayName || user.email || 'utilisateur'} !`);
    }, 500);
    
  } else {
    sessionStorage.removeItem('user');
  }
});

// ============================================
// MISE À JOUR DE L'INTERFACE
// ============================================
function updateUIBasedOnAuth() {
  const authButtons = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  
  if (authButtons && userMenu) {
    if (currentUser) {
      authButtons.style.display = 'none';
      userMenu.style.display = 'flex';
      
      const userName = document.getElementById('userName');
      const userAvatar = document.getElementById('userAvatar');
      
      if (userName) {
        userName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'Utilisateur';
      }
      if (userAvatar && currentUser.photoURL) {
        userAvatar.src = currentUser.photoURL;
        userAvatar.alt = currentUser.displayName || 'Avatar';
      }
    } else {
      authButtons.style.display = 'flex';
      userMenu.style.display = 'none';
    }
  }
}

// ============================================
// FONCTIONS D'AUTHENTIFICATION
// ============================================

/**
 * Connexion avec Google
 */
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    console.log('✅ Connexion Google réussie:', user.email);
    return result;
  } catch (error) {
    console.error('❌ Erreur Google:', error);
    handleAuthError(error);
  }
}

/**
 * Connexion avec Facebook
 */
async function loginWithFacebook() {
  try {
    const result = await auth.signInWithPopup(facebookProvider);
    const user = result.user;
    console.log('✅ Connexion Facebook réussie:', user.email);
    return result;
  } catch (error) {
    console.error('❌ Erreur Facebook:', error);
    handleAuthError(error);
  }
}

/**
 * Déconnexion
 */
async function logout() {
  try {
    await auth.signOut();
    console.log('✅ Déconnexion réussie');
    showToast('🔓 Déconnecté avec succès');
    
    // Redirection si sur page protégée
    if (window.location.pathname.includes('profile.html')) {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    showToast('❌ Erreur lors de la déconnexion', 'error');
  }
}

/**
 * Récupérer le token d'authentification
 */
async function getAuthToken() {
  if (currentUser) {
    return await currentUser.getIdToken();
  }
  return null;
}

/**
 * Vérifier si l'utilisateur est admin
 */
async function isAdmin() {
  if (!currentUser) return false;
  try {
    const token = await currentUser.getIdTokenResult();
    return token.claims.admin === true;
  } catch (e) {
    return false;
  }
}

// ============================================
// GESTION DES ERREURS
// ============================================
function handleAuthError(error) {
  let message = 'Erreur de connexion';
  
  switch (error.code) {
    case 'auth/popup-blocked':
      message = 'Popup bloqué par le navigateur. Autorise les popups pour ce site.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Fenêtre de connexion fermée avant validation.';
      break;
    case 'auth/account-exists-with-different-credential':
      message = 'Un compte existe déjà avec la même adresse email mais un fournisseur différent.';
      break;
    case 'auth/network-request-failed':
      message = 'Erreur réseau. Vérifie ta connexion internet.';
      break;
    case 'auth/too-many-requests':
      message = 'Trop de tentatives. Réessaie plus tard.';
      break;
    case 'auth/user-disabled':
      message = 'Ce compte a été désactivé.';
      break;
    case 'auth/user-not-found':
      message = 'Aucun compte associé à cette adresse.';
      break;
    case 'auth/wrong-password':
      message = 'Mot de passe incorrect.';
      break;
    default:
      message = error.message || 'Erreur inconnue';
  }
  
  showToast(`❌ ${message}`, 'error');
}

// ============================================
// GESTION FIREBASE - PROGRESSION
// ============================================

/**
 * Sauvegarder la progression de visionnage
 */
async function saveProgress(contentType, contentId, episode) {
  if (!currentUser || !db) return;
  
  try {
    await db.collection('users').doc(currentUser.uid).set({
      [`progress.${contentType}.${contentId}`]: episode,
      lastWatched: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Progression sauvegardée:', { contentType, contentId, episode });
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde progression:', error);
    return false;
  }
}

/**
 * Récupérer la progression de visionnage
 */
async function getProgress(contentType, contentId) {
  if (!currentUser || !db) return null;
  
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
      return doc.data()?.progress?.[contentType]?.[contentId] || null;
    }
  } catch (error) {
    console.error('❌ Erreur récupération progression:', error);
  }
  return null;
}

/**
 * Ajouter aux favoris
 */
async function addToFavorites(contentType, contentId, title, image, score) {
  if (!currentUser || !db) return false;
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const favorite = {
      id: contentId,
      type: contentType,
      title: title,
      image: image,
      score: score,
      addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await userRef.update({
      favorites: firebase.firestore.FieldValue.arrayUnion(favorite)
    });
    
    showToast(`❤️ ${title} ajouté aux favoris`);
    return true;
  } catch (error) {
    console.error('❌ Erreur ajout favoris:', error);
    return false;
  }
}

/**
 * Retirer des favoris
 */
async function removeFromFavorites(contentId) {
  if (!currentUser || !db) return false;
  
  try {
    const userRef = db.collection('users').doc(currentUser.uid);
    const doc = await userRef.get();
    const favorites = doc.data()?.favorites || [];
    const newFavorites = favorites.filter(f => f.id !== contentId);
    
    await userRef.update({ favorites: newFavorites });
    showToast(`🗑️ Retiré des favoris`);
    return true;
  } catch (error) {
    console.error('❌ Erreur retrait favoris:', error);
    return false;
  }
}

/**
 * Vérifier si dans les favoris
 */
async function isFavorite(contentId) {
  if (!currentUser || !db) return false;
  
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const favorites = doc.data()?.favorites || [];
    return favorites.some(f => f.id === contentId);
  } catch (error) {
    console.error('❌ Erreur vérification favoris:', error);
    return false;
  }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
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
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ============================================
// VÉRIFICATION DE SESSION PERSISTANTE
// ============================================
function checkStoredUser() {
  const storedUser = sessionStorage.getItem('user');
  if (storedUser && !currentUser) {
    const userData = JSON.parse(storedUser);
    // Rafraîchir l'état Firebase
    auth.onAuthStateChanged((user) => {
      if (!user && userData.uid) {
        console.log('🔄 Tentative de reconnexion automatique...');
      }
    });
  }
}

// ============================================
// EXPORT DES FONCTIONS (GLOBAL)
// ============================================
window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.logout = logout;
window.getAuthToken = getAuthToken;
window.isAdmin = isAdmin;
window.saveProgress = saveProgress;
window.getProgress = getProgress;
window.addToFavorites = addToFavorites;
window.removeFromFavorites = removeFromFavorites;
window.isFavorite = isFavorite;
window.showToast = showToast;

// ============================================
// INITIALISATION
// ============================================
checkStoredUser();

console.log('🔥 Firebase config chargé avec succès');
console.log('📧 Authentification Google et Facebook prêtes');
