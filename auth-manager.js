// auth-manager.js (AGGIORNATO per includere Record e Dati completi)

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importa ReCaptchaEnterpriseProvider
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
  authDomain: "database-atleti-fic.firebaseapp.com",
  projectId: "database-atleti-fic",
  storageBucket: "database-atleti-fic.appspot.com",
  messagingSenderId: "860422140545",
  appId: "1:860422140545:web:cd14c042a47f2650681380" 
};

// Inizializza in modo idempotente
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// --- CONFIGURAZIONE APP CHECK ---
try {
  const isLocalhost = location.hostname === "localhost" || location.hostname === "127.0.0.1";

  if (isLocalhost) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; 
  }

  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LdySxgsAAAAAOPjpX_oQPGTAJoqxJTNe9758JE0'),
    isTokenAutoRefreshEnabled: true
  });
  
} catch (e) {
  console.warn("AppCheck init warning:", e.message);
}
// -------------------------------

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
    localStorage.removeItem(CACHE_KEY); // Pulisce la cache al logout
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
    console.warn("Impossibile impostare persistenza:", pErr);
  }

  onAuthStateChanged(auth, async (user) => {
    let athlete = null;

    if (user && user.email) {
      // 1. Controlla se abbiamo dati in cache e se corrispondono all'utente attuale
      const cachedAthlete = window.getCurrentAthlete();
      
      // Se c'è cache valida, usala temporaneamente per velocità, ma...
      // NOTA: Per essere sicuri di avere i record aggiornati, facciamo SEMPRE il fetch o invalidiamo la cache
      // se mancano i campi rowerg/bikeerg.
      
      let needFetch = true;

      if (cachedAthlete && cachedAthlete.uid === user.uid) {
         // Se abbiamo già i campi record nella cache, potremmo evitare il fetch, 
         // ma per sicurezza (se li aggiorni da un'altra parte) è meglio ricaricare o controllare se mancano.
         if (cachedAthlete.rowerg !== undefined && cachedAthlete.bikeerg !== undefined) {
             athlete = cachedAthlete;
             needFetch = false; 
         }
      }

      if (needFetch) {
        console.log("Recupero dati completi (inclusi record) da Firestore...");
        try {
          const q = query(collection(db, "atleti"), where("uid", "==", user.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const athleteDoc = querySnapshot.docs[0];
            const athleteData = athleteDoc.data();
            
            // --- COSTRUZIONE OGGETTO COMPLETO ---
            athlete = {
              id: athleteDoc.id,
              uid: user.uid,
              email: user.email,
              
              // Dati Anagrafici
              cognome: athleteData.cognome || '',
              nome: athleteData.nome || '',
              societa: athleteData.societa || '',
              gruppo: athleteData.gruppo || '',
              
              // Record / Dati Tecnici (Quelli che mancavano!)
              // Mappiamo sia i nuovi nomi (rowerg/bikeerg) che i vecchi (pb_2000...) per compatibilità
              rowerg: athleteData.rowerg || athleteData.pb_2000 || '--:--',
              bikeerg: athleteData.bikeerg || athleteData.pb_6000 || '--:--',
              
              // Altri campi utili se servono
              peso: athleteData.peso || '',
              altezza: athleteData.altezza || ''
            };

            // Aggiorna la cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(athlete));
            console.log("Dati atleta aggiornati in cache:", athlete);
          } else {
            console.error("Utente autenticato ma non trovato in 'atleti'.");
            document.dispatchEvent(new CustomEvent('authStateReady', {
              detail: { athlete: null, error: { code: 'no-athlete-doc', message: 'Utente non presente in collection atleti' } }
            }));
            return;
          }
        } catch (dbError) {
          console.error("Errore nel recupero dati da Firestore:", dbError);
          document.dispatchEvent(new CustomEvent('authStateReady', {
            detail: { athlete: null, error: dbError }
          }));
          return;
        }
      }

      // Redirect se siamo nella login page
      if (isLoginPage()) {
        window.location.href = 'home.html';
        return;
      }

      // Notifica l'applicazione che i dati sono pronti
      document.dispatchEvent(new CustomEvent('authStateReady', {
        detail: { athlete: athlete, error: null }
      }));

    } else {
      // NON autenticato
      localStorage.removeItem(CACHE_KEY);

      if (!isLoginPage()) {
        const path = window.location.pathname;
        // Gestione redirect per sottocartelle
        if (path.includes('/CARICA DATI/') || path.includes('/RISULTATI/') || path.includes('/CALENDARIO/')) {
             window.location.href = '../index.html';
        } else {
             window.location.href = 'index.html';
        }
        return;
      }

      document.dispatchEvent(new CustomEvent('authStateReady', {
        detail: { athlete: null, error: null }
      }));
    }
  });
};

authStateManager();
