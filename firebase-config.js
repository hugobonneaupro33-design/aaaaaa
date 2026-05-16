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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Fournisseurs d'authentification
const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

// Configuration des popups
googleProvider.setCustomParameters({ prompt: 'select_account' });
facebookProvider.setCustomParameters({ display: 'popup' });

// État de l'utilisateur
let currentUser = null;

// Observer les changements de connexion
auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateUIBasedOnAuth();
  
  // Déclencher un événement personnalisé
  const event = new CustomEvent('authChanged', { detail: user });
  document.dispatchEvent(event);
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
      
      if (userName) userName.textContent = currentUser.displayName || currentUser.email;
      if (userAvatar && currentUser.photoURL) userAvatar.src = currentUser.photoURL;
    } else {
      authButtons.style.display = 'flex';
      userMenu.style.display = 'none';
    }
  }
}

// Fonctions d'authentification
async function loginWithGoogle() {
  try {
    const result = await auth.signInWithPopup(googleProvider);
    showToast(`Bienvenue ${result.user.displayName || result.user.email} !`, 'success');
    return result;
  } catch (error) {
    console.error('Erreur Google:', error);
    showToast('Erreur de connexion Google: ' + error.message, 'error');
  }
}

async function loginWithFacebook() {
  try {
    const result = await auth.signInWithPopup(facebookProvider);
    showToast(`Bienvenue ${result.user.displayName || result.user.email} !`, 'success');
    return result;
  } catch (error) {
    console.error('Erreur Facebook:', error);
    showToast('Erreur de connexion Facebook: ' + error.message, 'error');
  }
}

async function logout() {
  try {
    await auth.signOut();
    showToast('Déconnecté avec succès', 'success');
  } catch (error) {
    console.error('Erreur déconnexion:', error);
    showToast('Erreur lors de la déconnexion', 'error');
  }
}

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
