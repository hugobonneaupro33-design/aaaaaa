// Configuration Firebase - REMPLACE PAR TES INFOS
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app();
}

const auth = firebase.auth();
let db = null;

// Initialiser Firestore uniquement si disponible
try {
  db = firebase.firestore();
} catch (e) {
  console.warn("Firestore non disponible:", e);
}

// Fournisseurs d'authentification
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Configuration des popups
googleProvider.setCustomParameters({ 
  prompt: 'select_account'
});

facebookProvider.setCustomParameters({ 
  display: 'popup'
});

// État de l'utilisateur
let currentUser = null;

// Événement personnalisé
const authChangedEvent = new CustomEvent('authChanged', { detail: null });

// Observer les changements de connexion
auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateUIBasedOnAuth();
  
  // Déclencher un événement personnalisé
  const event = new CustomEvent('authChanged', { detail: user });
  document.dispatchEvent(event);
  
  // Sauvegarder l'état dans sessionStorage pour persistance
  if (user) {
    sessionStorage.setItem('user', JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    }));
  } else {
    sessionStorage.removeItem('user');
  }
});

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
        userName.textContent = currentUser.displayName || currentUser.email || 'Utilisateur';
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

// Vérifier si l'utilisateur était connecté précédemment
function checkStoredUser() {
  const storedUser = sessionStorage.getItem('user');
  if (storedUser && !currentUser) {
    const userData = JSON.parse(storedUser);
    // Rafraîchir l'état Firebase
    auth.onAuthStateChanged((user) => {
      if (!user && userData.uid) {
        // Tentative de reconnexion silencieuse
        auth.signInWithCustomToken(userData.token).catch(console.warn);
      }
    });
  }
}

// Fonctions d'authentification
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    showToast(`✨ Bienvenue ${user.displayName || user.email || 'utilisateur'} !`, 'success');
    
    // Créer ou mettre à jour le document utilisateur dans Firestore
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
        console.warn("Firestore non disponible:", e);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erreur Google:', error);
    let errorMessage = 'Erreur de connexion Google';
    
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup bloqué par le navigateur. Autorise les popups pour ce site.';
    } else if (error.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Fenêtre de connexion fermée avant validation.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(`❌ ${errorMessage}`, 'error');
  }
}

async function loginWithFacebook() {
  try {
    const result = await auth.signInWithPopup(facebookProvider);
    const user = result.user;
    showToast(`✨ Bienvenue ${user.displayName || user.email || 'utilisateur'} !`, 'success');
    
    // Créer ou mettre à jour le document utilisateur dans Firestore
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
        console.warn("Firestore non disponible:", e);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erreur Facebook:', error);
    let errorMessage = 'Erreur de connexion Facebook';
    
    if (error.code === 'auth/popup-blocked') {
      errorMessage = 'Popup bloqué par le navigateur. Autorise les popups pour ce site.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorMessage = 'Un compte existe déjà avec la même adresse email mais un fournisseur différent.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    showToast(`❌ ${errorMessage}`, 'error');
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast('🔓 Déconnecté avec succès', 'success');
    
    // Rediriger vers la page d'accueil si on est sur une page protégée
    if (window.location.pathname.includes('profile.html')) {
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    }
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    showToast('❌ Erreur lors de la déconnexion', 'error');
  }
}

// Fonction pour obtenir le token d'authentification
async function getAuthToken() {
  if (currentUser) {
    return await currentUser.getIdToken();
  }
  return null;
}

// Fonction pour vérifier si l'utilisateur est admin (à personnaliser)
async function isAdmin() {
  if (!currentUser) return false;
  
  try {
    const token = await currentUser.getIdTokenResult();
    return token.claims.admin === true;
  } catch (e) {
    return false;
  }
}

// Toast notification améliorée
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
  
  // Auto-fermeture après 4 secondes
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Export des fonctions pour usage global
window.loginWithGoogle = loginWithGoogle;
window.loginWithFacebook = loginWithFacebook;
window.logout = logout;
window.getAuthToken = getAuthToken;
window.isAdmin = isAdmin;

// Initialiser la vérification de session stockée
checkStoredUser();

// Afficher un message dans la console pour confirmer le chargement
console.log('🔥 Firebase config chargé avec succès');
