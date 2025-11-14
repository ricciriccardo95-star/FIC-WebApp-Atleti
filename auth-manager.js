// File: auth-manager.js
// Questo file gestirà tutta la logica di autenticazione e la cache dei dati utente.

// Importa tutto il necessario da Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// *** 1. AGGIUNGI IMPORT PER APP CHECK ***
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

// Usa la stessa configurazione che hai in index.html
const firebaseConfig = {
    apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
    authDomain: "database-atleti-fic.firebaseapp.com",
    databaseURL: "https://database-atleti-fic-default-rtdb.firebaseio.com",
    projectId: "database-atleti-fic",
    storageBucket: "database-atleti-fic.appspot.com",
    messagingSenderId: "860422140545",
    appId: "1:860422140545:web:cd14c047f2650681380"
};

// Inizializza Firebase ED ESPORTA le istanze per l'uso in altri moduli
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// *** 2. INIZIALIZZA APP CHECK (VERSIONE DI PRODUZIONE) ***
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LeQ7wwsAAAAAHXKqRPOR70fWD_NfWFO03pwkZvY'),
  isTokenAutoRefreshEnabled: true
});


const CACHE_KEY = 'currentAthlete';

/**
 * Funzione globale per ottenere i dati dell'atleta dalla cache (localStorage).
 * @returns {Object | null} I dati dell'atleta (id, cognome, email, gruppo) o null.
 */
window.getCurrentAthlete = () => {
    const atletaData = localStorage.getItem(CACHE_KEY);
    try {
        // Aggiunto try-catch per sicurezza se i dati in localStorage fossero corrotti
        return atletaData ? JSON.parse(atletaData) : null;
    } catch (e) {
        console.error("Errore nel parsing dei dati atleta da localStorage:", e);
        localStorage.removeItem(CACHE_KEY); // Rimuovi dati corrotti
        return null;
    }
};

/**
 * Funzione globale per eseguire il logout.
 */
window.appLogout = () => {
    signOut(auth).catch((error) => {
        console.error('Logout Error', error);
    });
    // onAuthStateChanged gestirà la pulizia e il redirect
};

/**
 * Funzione helper per determinare se ci si trova su una pagina di login.
 */
const isLoginPage = () => {
    // Check if the path ends with /index.html or is exactly /
    const path = window.location.pathname;
    // Considera anche la root del sito (es. "http://tuosito.com/")
    // Assumendo che la tua app sia in 'WEB APP ATLETI/', il path potrebbe essere /WEB%20APP%20ATLETI/ o /WEB%20APP%20ATLETI/index.html
    const normalizedPath = path.toLowerCase();
    return normalizedPath.endsWith('/index.html') || normalizedPath.endsWith('/');
};


/**
 * Gestore di autenticazione centrale.
 * Viene eseguito una volta al caricamento di QUALSIASI pagina.
 */
const authStateManager = async () => {
    try {
        await setPersistence(auth, browserLocalPersistence);

        onAuthStateChanged(auth, async (user) => {
            let athlete = null;
            let error = null;

            // --- CORREZIONE 1: Controlla se l'utente esiste E HA UN'EMAIL ---
            // Questo esclude gli utenti anonimi, che causano il crash
            if (user && user.email) {
                // --- UTENTE CON EMAIL LOGGATO ---
                athlete = window.getCurrentAthlete(); // Prova a leggere dalla cache

                if (!athlete || athlete.email !== user.email) {
                    console.log("Dati atleta non in cache o email non corrispondente. Recupero da Firestore...");
                    try {
                        // Questa riga ora è sicura
                        const q = query(collection(db, "atleti"), where("email", "==", user.email.toLowerCase()));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const athleteDoc = querySnapshot.docs[0];
                            const athleteData = athleteDoc.data();
                            athlete = { // Aggiorna la variabile athlete locale
                                id: athleteDoc.id,
                                cognome: athleteData.cognome,
                                email: user.email,
                                gruppo: athleteData.gruppo || null
                            };
                            localStorage.setItem(CACHE_KEY, JSON.stringify(athlete));
                            console.log("Dati atleta recuperati e salvati in cache:", athlete);
                        } else {
                            console.error("Utente autenticato ma non trovato nel database 'atleti'. Eseguo logout.");
                            await window.appLogout(); // Esegui il logout forzato
                            return; // Esce dalla funzione onAuthStateChanged
                        }
                    } catch (dbError) {
                        console.error("Errore during recupero dati da Firestore (forse rete assente):", dbError);
                        localStorage.removeItem(CACHE_KEY);
                        // Esegui logout se il database fallisce (errore intermittente)
                        await window.appLogout();
                        return;
                    }
                }

                // Reindirizzamento DOPO aver gestito i dati
                if (isLoginPage()) {
                    // Redirect relative to the current location if login page detected
                    window.location.href = 'home.html';
                    return; // Esce per evitare l'invio dell'evento sulla pagina di login
                }
                
                // --- CORREZIONE 2: Invia l'evento QUI (risolve il loop) ---
                console.log('Dispatching authStateReady (LOGGED IN). Athlete:', athlete);
                document.dispatchEvent(new CustomEvent('authStateReady', {
                    detail: {
                        athlete: athlete,
                        error: null // Nessun errore
                    }
                }));

            } else {
                // --- UTENTE NON LOGGATO O ANONIMO ---
                localStorage.removeItem(CACHE_KEY); // Pulisci la cache

                // Reindirizzamento se non siamo già su index.html
                if (!isLoginPage()) {
                    // CORREZIONE: Il reindirizzamento deve tornare INDIETRO alla index.
                    const path = window.location.pathname;
                    const segments = path.split('/').filter(Boolean);
                    
                    // Se il percorso ha più segmenti E l'ultimo segmento è un file .html
                    // (es. ['RISULTATI', 'home_ranking.html']), allora siamo in una sottocartella.
                    if (segments.length > 1 && segments[segments.length - 1].endsWith('.html')) {
                         window.location.href = '../index.html'; // Torna su di un livello
                    } else if (segments.length === 1 && segments[0].endsWith('.html')) {
                         // Siamo al livello root (es. /home.html)
                         window.location.href = 'index.html'; // Vai a index.html nella stessa cartella
                    }
                    // Se il path è solo '/' (isLoginPage() sarebbe true) o altro, non fa nulla
                    // Questa logica gestisce /RISULTATI/home_ranking.html -> ../index.html
                    // E /home.html -> index.html
                    return;
                }
                
                // --- CORREZIONE 2: Invia l'evento QUI (risolve il loop) ---
                console.log('Dispatching authStateReady (LOGGED OUT / ANONYMOUS).');
                document.dispatchEvent(new CustomEvent('authStateReady', {
                    detail: {
                        athlete: null,
                        error: null
                    }
                }));
            }
        });

    } catch (error) {
        console.error("Errore nell'impostare la persistenza:", error);
        // Segnala errore critico
        document.dispatchEvent(new CustomEvent('authStateReady', { detail: { athlete: null, error: error } }));
    }
};

// Avvia il gestore di autenticazione
authStateManager();
