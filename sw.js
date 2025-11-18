const CACHE_NAME = 'fic-pwa-cache-v1.42'; // <-- INCREMENTATO A 1.42

// Lista dei file fondamentali dell'applicazione da mettere in cache.
const urlsToCache = [
  '/',
  'index.html',
  'home.html',           // <-- Aggiunto: è la pagina principale dopo il login
  'auth-manager.js',     // <-- Aggiunto: gestisce il login, fondamentale
  'manifest.json',
  
  // --- DIPENDENZE ESTERNE (CSS & FONTS) ---
  'https://cdn.tailwindcss.com', // <-- FONDAMENTALE: Senza questo la grafica si rompe offline!
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display.swap',
  
  // --- PAGINE INTERNE ---
  'storico_wo.html',
  'RISULTATI/home_ranking.html',
  'RISULTATI/ranking_ergo.html',
  'RISULTATI/ranking_bike.html',
  'RISULTATI/ranking_boat.html',
  'CARICA DATI/home_carica_dati.html',
  'CARICA DATI/modulo_ergo.html',
  'CARICA DATI/modulo_bike.html',
  'CARICA DATI/modulo_boat.html',
  'CARICA DATI/peso.html',
  'CARICA DATI/grafici_athletes.html',
  'CALENDARIO/calendario.html',
  
  // --- IMMAGINI ---
  'logo.png',
  'LOGO FIC APP (192).png',
  'LOGO FIC APP (512).png'
  // NOTA: Controlla che i nomi delle immagini qui corrispondano ESATTAMENTE
  // a quelli nel tuo HTML (es. 'logo-fic (1) copia.png' se usi quello).
];

// Evento 'install':
self.addEventListener('install', event => {
  console.log('Nuovo Service Worker in installazione...');
  self.skipWaiting(); // Forza l'attivazione immediata

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta e file principali memorizzati');
        // cache.addAll può fallire se uno solo dei file non viene trovato.
        // Se vedi errori in console, controlla i percorsi.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Impossibile memorizzare i file nella cache:', error);
      })
  );
});

// Evento 'activate':
self.addEventListener('activate', event => {
  console.log('Nuovo Service Worker in attivazione...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('fic-pwa-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Eliminazione vecchia cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker attivo e pronto a prendere il controllo.');
      return self.clients.claim();
    })
  );
});

// Evento 'fetch':
self.addEventListener('fetch', event => {
  // Strategia "Network-First" (Rete prima, poi Cache)
  
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Se la risposta dalla rete è valida, la cloniamo e aggiorniamo la cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            // Nota: le risposte 'opaque' (es. CDN esterni) a volte hanno status 0, 
            // ma le cachiamo comunque se necessario, o ritorniamo direttamente networkResponse.
            // Per semplicità qui ritorniamo la risposta di rete diretta se è un CDN.
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        
        return networkResponse;
      })
      .catch(error => {
        // Rete fallita (Offline)
        console.warn(`Richiesta di rete fallita per: ${event.request.url}. Cerco in cache...`);
        
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }

            // --- GESTIONE ERRORI MIGLIORATA ---
            
            // 1. Se è una navigazione (l'utente cerca di aprire una pagina HTML),
            // e non è in cache, mostriamo un messaggio o una pagina offline.
            if (event.request.mode === 'navigate') {
                return new Response('<h1>Sei offline e questa pagina non è stata salvata.</h1><p>Torna alla home o riprova quando hai connessione.</p>', {
                    status: 404,
                    headers: { 'Content-Type': 'text/html' }
                });
            }

            // 2. IMPORTANTE: Se manca un CSS, JS o Immagine (risorse secondarie),
            // NON restituire testo html/plain, altrimenti il browser prova a eseguirlo e spacca la grafica.
            // Restituiamo un vero 404 o null.
            return new Response(null, { status: 404, statusText: 'Not Found' });
          });
      })
  );
});
