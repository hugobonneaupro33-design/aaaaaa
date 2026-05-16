// ============================================
// CONFIGURATION FIREBASE
// ============================================

// REMPLACE PAR TES INFOS FIREBASE
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// ============================================
// INITIALISATION
// ============================================

// Initialiser Firebase (évite les doublons)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Services
const auth = firebase.auth();
let db = null;

// Initialiser Firestore avec gestion d'erreur
try {
  db = firebase.firestore();
  // Activer la persistance offline
  db.enablePersistence().catch(err => {
    console.warn('Persistence non activée:', err);
  });
} catch (e) {
  console.warn("Firestore non disponible:", e);
}

// ============================================
// AUTHENTIFICATION
// ============================================

// Fournisseurs
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Configuration
googleProvider.setCustomParameters({ 
  prompt: 'select_account'
});

facebookProvider.setCustomParameters({ 
  display: 'popup'
});

// État utilisateur
let currentUser = null;

// ============================================
// GESTIONNAIRE DE SESSION
// ============================================

// Observer les changements de connexion
auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateUIBasedOnAuth();
  
  // Événement personnalisé
  document.dispatchEvent(new CustomEvent('authChanged', { detail: user }));
  
  // Persistance session
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
        console.warn("Firestore update:", e);
      }
    }
  } else {
    sessionStorage.removeItem('user');
  }
});

// ============================================
// INTERFACE UTILISATEUR
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

async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    showToast(`✨ Bienvenue ${result.user.displayName || result.user.email || 'utilisateur'} !`);
    return result;
  } catch (error) {
    console.error('Erreur Google:', error);
    handleAuthError(error);
  }
}

async function loginWithFacebook() {
  try {
    const result = await auth.signInWithPopup(facebookProvider);
    showToast(`✨ Bienvenue ${result.user.displayName || result.user.email || 'utilisateur'} !`);
    return result;
  } catch (error) {
    console.error('Erreur Facebook:', error);
    handleAuthError(error);
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast('🔓 Déconnecté avec succès');
    
    // Redirection si sur page protégée
    if (window.location.pathname.includes('profile.html')) {
      setTimeout(() => window.location.href = 'index.html', 1500);
    }
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    showToast('❌ Erreur lors de la déconnexion', 'error');
  }
}

// ============================================
// GESTION DES ERREURS
// ============================================

function handleAuthError(error) {
  let message = 'Erreur de connexion';
  
  switch (error.code) {
    case 'auth/popup-blocked':
      message = 'Popup bloqué. Autorise les popups pour ce site.';
      break;
    case 'auth/popup-closed-by-user':
      message = 'Fenêtre fermée avant validation.';
      break;
    case 'auth/account-exists-with-different-credential':
      message = 'Un compte existe déjà avec cette email.';
      break;
    case 'auth/network-request-failed':
      message = 'Erreur réseau. Vérifie ta connexion.';
      break;
    default:
      message = error.message || 'Erreur inconnue';
  }
  
  showToast(`❌ ${message}`, 'error');
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
// FONCTIONS UTILITAIRES
// ============================================

async function getAuthToken() {
  return currentUser ? await currentUser.getIdToken() : null;
}

async function isAdmin() {
  if (!currentUser) return false;
  try {
    const token = await currentUser.getIdTokenResult();
    return token.claims.admin === true;
  } catch {
    return false;
  }
}

// Sauvegarder la progression
async function saveProgress(contentType, contentId, episode) {
  if (!currentUser || !db) return;
  
  try {
    await db.collection('users').doc(currentUser.uid).set({
      [`progress.${contentType}.${contentId}`]: episode,
      lastWatched: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Erreur sauvegarde:', error);
  }
}

// Récupérer la progression
async function getProgress(contentType, contentId) {
  if (!currentUser || !db) return null;
  
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
      return doc.data()?.progress?.[contentType]?.[contentId] || null;
    }
  } catch (error) {
    console.error('Erreur récupération:', error);
  }
  return null;
}

// ============================================
// EXPORT GLOBAL
// ============================================

window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.logout = logout;
window.getAuthToken = getAuthToken;
window.isAdmin = isAdmin;
window.saveProgress = saveProgress;
window.getProgress = getProgress;
window.showToast = showToast;

console.log('🔥 Firebase config chargé avec succès');
