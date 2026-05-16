// Firebase configuration - Remplace par tes propres infos
// Va sur https://console.firebase.google.com/ pour créer un projet
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",           // À remplacer
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

// État de l'utilisateur
let currentUser = null;

// Observer les changements de connexion
auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateUIBasedOnAuth();
});

function updateUIBasedOnAuth() {
  const authButtons = document.getElementById('authButtons');
  const userMenu = document.getElementById('userMenu');
  
  if (currentUser) {
    // Utilisateur connecté
    if (authButtons) authButtons.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'flex';
      document.getElementById('userName').textContent = currentUser.displayName || currentUser.email;
      if (currentUser.photoURL) {
        document.getElementById('userAvatar').src = currentUser.photoURL;
      }
    }
  } else {
    // Utilisateur déconnecté
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
  }
}

// Fonctions d'authentification
function loginWithGoogle() {
  auth.signInWithPopup(googleProvider).catch(console.error);
}

function loginWithFacebook() {
  auth.signInWithPopup(facebookProvider).catch(console.error);
}

function logout() {
  auth.signOut();
}
