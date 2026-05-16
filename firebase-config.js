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
// INITIALISATION
// ============================================

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
let db = null;

try {
  db = firebase.firestore();
  db.enablePersistence().catch(err => console.warn('Persistence non activée:', err));
} catch (e) {
  console.warn("Firestore non disponible:", e);
}

// ============================================
// AUTHENTIFICATION
// ============================================

const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
facebookProvider.setCustomParameters({ display: 'popup' });

let currentUser = null;

// ============================================
// SESSION
// ============================================

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  updateUIBasedOnAuth();
  document.dispatchEvent(new CustomEvent('authChanged', { detail: user }));
  
  if (user) {
    sessionStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }));
    
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
// INTERFACE
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
      
      if (userName) userName.textContent = currentUser.displayName || currentUser.email?.split('@')[0] || 'Utilisateur';
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
// FONCTIONS AUTH
// ============================================

async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    showToast(`✨ Bienvenue ${result.user.displayName || result.user.email || 'utilisateur'} !`);
    return result;
  } catch (error) {
    handleAuthError(error);
  }
}

async function loginWithFacebook() {
  try {
    const result = await auth.signInWithPopup(facebookProvider);
    showToast(`✨ Bienvenue ${result.user.displayName || result.user.email || 'utilisateur'} !`);
    return result;
  } catch (error) {
    handleAuthError(error);
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast('🔓 Déconnecté avec succès');
    if (window.location.pathname.includes('profile.html')) {
      setTimeout(() => window.location.href = 'index.html', 1500);
    }
  } catch (error) {
    showToast('❌ Erreur lors de la déconnexion', 'error');
  }
}

// ============================================
// GESTION ERREURS
// ============================================

function handleAuthError(error) {
  let message = 'Erreur de connexion';
  switch (error.code) {
    case 'auth/popup-blocked': message = 'Popup bloqué. Autorise les popups.'; break;
    case 'auth/popup-closed-by-user': message = 'Fenêtre fermée avant validation.'; break;
    case 'auth/account-exists-with-different-credential': message = 'Un compte existe déjà avec cette email.'; break;
    case 'auth/network-request-failed': message = 'Erreur réseau. Vérifie ta connexion.'; break;
    default: message = error.message || 'Erreur inconnue';
  }
  showToast(`❌ ${message}`, 'error');
}

// ============================================
// TOAST
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
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ============================================
// UTILITAIRES
// ============================================

async function getAuthToken() {
  return currentUser ? await currentUser.getIdToken() : null;
}

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

async function getProgress(contentType, contentId) {
  if (!currentUser || !db) return null;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    return doc.exists ? doc.data()?.progress?.[contentType]?.[contentId] : null;
  } catch (error) {
    return null;
  }
}

// ============================================
// EXPORTS
// ============================================

window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.logout = logout;
window.getAuthToken = getAuthToken;
window.saveProgress = saveProgress;
window.getProgress = getProgress;
window.showToast = showToast;

console.log('✅ Firebase config chargé - Projet: arkya-animemanga');
