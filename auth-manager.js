// File: auth-manager.js
// Questo file gestirà tutta la logica di autenticazione e la cache dei dati utente.

// Importa tutto il necessario da Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    return path.endsWith('/index.html') || path === '/' || path.endsWith('/');
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
            let error = null; // Aggiunto per tracciare errori

            if (user) {
                // --- UTENTE LOGGATO ---
                athlete = window.getCurrentAthlete(); // Prova a leggere dalla cache

                // Se l'utente è loggato ma i suoi dati non sono in cache o non corrispondono
                if (!athlete || athlete.email !== user.email) {
                    console.log("Dati atleta non in cache o email non corrispondente. Recupero da Firestore...");
                    try {
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
                            error = new Error("Utente autenticato ma non trovato nel database 'atleti'.");
                            console.error(error.message);
                            localStorage.removeItem(CACHE_KEY); // Pulisce cache in caso di errore
                            await window.appLogout(); // Esegui il logout forzato
                            return; // Esce dalla funzione onAuthStateChanged
                        }
                    } catch (dbError) {
                        console.error("Errore durante il recupero dati da Firestore:", dbError);
                        localStorage.removeItem(CACHE_KEY);
                        athlete = null;
                        error = dbError; // Salva l'errore del database
                    }
                }

                // Reindirizzamento DOPO aver gestito i dati
                if (isLoginPage()) {
                    // Redirect relative to the current location if login page detected
                    window.location.href = 'home.html';
                    return; // Esce per evitare l'invio dell'evento sulla pagina di login
                }
                
                // --- FIX: INVIA L'EVENTO QUI (per utente loggato su pagina interna) ---
                console.log('Dispatching authStateReady (LOGGED IN). Athlete:', athlete, 'Error:', error);
                document.dispatchEvent(new CustomEvent('authStateReady', {
                    detail: {
                        athlete: athlete,
                        error: error
                    }
                }));

            } else {
                // --- UTENTE NON LOGGATO ---
                localStorage.removeItem(CACHE_KEY); // Pulisci la cache

                // Reindirizzamento
                if (!isLoginPage()) {
                    // Redirect relative to the current location if not on login page
                    // Assumes index.html is in the same directory or root
                    window.location.href = 'index.html';
                    return; // Esce per evitare l'invio dell'evento se stiamo reindirizzando
                }

                // --- FIX: INVIA L'EVENTO QUI (per utente non loggato su pagina di login) ---
                console.log('Dispatching authStateReady (LOGGED OUT).');
                document.dispatchEvent(new CustomEvent('authStateReady', {
                    detail: {
                        athlete: null,
                        error: null
                    }
                }));
            }

            // --- FIX: Rimosso l'invio dell'evento da qui ---
            // (Era qui che causava il bug)
        });

    } catch (error) {
        console.error("Errore nell'impostare la persistenza:", error);
        // Segnala errore critico
        document.dispatchEvent(new CustomEvent('authStateReady', { detail: { athlete: null, error: error } }));
    }
};

// Avvia il gestore di autenticazione
authStateManager();