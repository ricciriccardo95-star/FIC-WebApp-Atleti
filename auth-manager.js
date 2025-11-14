// auth-manager.js (versione aggiornata)
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
  authDomain: "database-atleti-fic.firebaseapp.com",
  projectId: "database-atleti-fic",
  storageBucket: "database-atleti-fic.appspot.com",
  messagingSenderId: "860422140545",
  appId: "1:860422140545:web:cd14c047f2650681380"
};

// Inizializza in modo idempotente (evita doppie inizializzazioni)
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// App Check: usa ReCaptcha in produzione, fallback a debug in localhost
try {
  const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (isLocalhost) {
    // Debug mode: per sviluppo, impostare FIREBASE_APPCHECK_DEBUG_TOKEN nell'ambiente del browser
    // (seguire la guida Firebase per ottenere il token) oppure usare provider di debug.
    // Qui usiamo ReCaptchaV3Provider ma puoi sostituire con debug provider se preferisci.
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LeQ7wwsAAAAAHXKqRPOR70fWD_NfWFO03pwkZvY'),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LeQ7wwsAAAAAHXKqRPOR70fWD_NfWFO03pwkZvY'),
      isTokenAutoRefreshEnabled: true
    });
  }
} catch (e) {
  console.warn("AppCheck init warning:", e.message);
}

const CACHE_KEY = 'currentAthlete';

window.getCurrentAthlete = () => {
  const atletaData = localStorage.getItem(CACHE_KEY);
  if (!atletaData) return null;
  try {
    return JSON.parse(atletaData);
  } catch (err) {
    console.error("Errore parsing cache atleta:", err);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

window.appLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout Error', error);
  }
};

const isLoginPage = () => {
  const path = window.location.pathname;
  const normalizedPath = path.toLowerCase();
  return normalizedPath.endsWith('/index.html') || normalizedPath === '/' || normalizedPath.endsWith('/');
};

const authStateManager = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (pErr) {
    console.warn("Impossibile impostare persistenza, procedo comunque:", pErr);
  }

  onAuthStateChanged(auth, async (user) => {
    let athlete = null;

    if (user && user.email) {
      athlete = window.getCurrentAthlete();

      if (!athlete || athlete.uid !== user.uid) {
        console.log("Cache mancante o UID diverso. Recupero da Firestore...");
        try {
          const q = query(collection(db, "atleti"), where("uid", "==", user.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const athleteDoc = querySnapshot.docs[0];
            const athleteData = athleteDoc.data();
            athlete = {
              id: athleteDoc.id,
              uid: user.uid,
              cognome: athleteData.cognome || null,
              email: user.email,
              gruppo: athleteData.gruppo || null
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(athlete));
            console.log("Dati atleta in cache:", athlete);
          } else {
            console.error("Utente autenticato ma non trovato in 'atleti'. Non effettuo subito logout.");
            // NON forzare logout immediato: lascia un messaggio e disabilita funzioni che richiedono dati profilo
            document.dispatchEvent(new CustomEvent('authStateReady', {
              detail: { athlete: null, error: { code: 'no-athlete-doc', message: 'Utente non presente in collection atleti' } }
            }));
            return;
          }
        } catch (dbError) {
          console.error("Errore nel recupero dati da Firestore:", dbError);
          // Non rimuovere la cache e non eseguire logout forzato; segnala errore
          document.dispatchEvent(new CustomEvent('authStateReady', {
            detail: { athlete: null, error: dbError }
          }));
          return;
        }
      }

      if (isLoginPage()) {
        window.location.href = 'home.html';
        return;
      }

      console.log('Dispatching authStateReady (LOGGED IN). Athlete:', athlete);
      document.dispatchEvent(new CustomEvent('authStateReady', {
        detail: { athlete: athlete, error: null }
      }));

    } else {
      // NON autenticato o anonimo
      localStorage.removeItem(CACHE_KEY);

      if (!isLoginPage()) {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 1 && segments[segments.length - 1].endsWith('.html')) {
          window.location.href = '../index.html';
        } else if (segments.length === 1 && segments[0].endsWith('.html')) {
          window.location.href = 'index.html';
        } else {
          // se siamo già in root o index, non fare nulla
        }
        return;
      }

      console.log('Dispatching authStateReady (LOGGED OUT).');
      document.dispatchEvent(new CustomEvent('authStateReady', {
        detail: { athlete: null, error: null }
      }));
    }
  });
};

authStateManager();
