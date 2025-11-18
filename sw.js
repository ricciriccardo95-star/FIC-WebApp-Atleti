/*
  IMPORTANTE: Aggiorna questo numero di versione!
  Qualsiasi modifica a questo file richiede un incremento della versione
  per forzare il browser a installare il nuovo Service Worker.
  Es. 'fic-pwa-cache-v1.39'
*/
const CACHE_NAME = 'fic-pwa-cache-v1.40'; // <-- INCREMENTA QUESTA VERSIONE

// Lista dei file fondamentali dell'applicazione da mettere in cache.
const urlsToCache = [
  '/',
  'index.html',
  'manifest.json',
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
  'logo.png',
  'LOGO FIC APP (192).png',
  'LOGO FIC APP (512).png'
  // Potresti aggiungere una pagina 'offline.html' generica qui
  // 'offline.html'
];

// Evento 'install':
self.addEventListener('install', event => {
  console.log('Nuovo Service Worker in installazione...');
  
  // MODIFICA 1: Forza il nuovo Service Worker ad attivarsi subito
  // non appena l'installazione è completata, senza aspettare
  // che i vecchi client (schede) vengano chiusi.
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta e file principali memorizzati');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Impossibile memorizzare i file nella cache durante l\'installazione:', error);
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
          // Filtra le cache che iniziano con il nostro prefisso ma non sono quella attuale.
          return cacheName.startsWith('fic-pwa-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Eliminazione vecchia cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // MODIFICA 2: Forza il SW attivato a prendere il controllo
      // immediato di tutte le pagine aperte.
      console.log('Service Worker attivo e pronto a prendere il controllo.');
      return self.clients.claim();
    })
  );
});

// Evento 'fetch':
self.addEventListener('fetch', event => {
  // MODIFICA 3: Strategia "Network-First" (Rete prima, poi Cache)
  // Questa strategia prova *prima* a scaricare la risorsa dalla rete.
  // - Se ci riesce, la restituisce all'utente e AGGIORNA la cache.
  // - Se fallisce (es. offline), prova a prenderla dalla cache.
  // Questo garantisce che gli utenti abbiano sempre i dati più freschi
  // quando sono online, mantenendo la funzionalità offline.
  
  event.respondWith(
    // 1. Prova prima la rete
    fetch(event.request)
      .then(networkResponse => {
        // 2. Risposta ricevuta dalla rete
        
        // Clona la risposta. Una risposta può essere letta solo una volta.
        // Ci serve una copia per la cache e una da inviare al browser.
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then(cache => {
            // Aggiorna la cache con la nuova risposta dalla rete
            // Usiamo 'put' per sovrascrivere la vecchia versione
            cache.put(event.request, responseToCache);
          });
        
        // Restituisce la risposta fresca dalla rete
        return networkResponse;
      })
      .catch(error => {
        // 3. La rete ha fallito (es. sei offline)
        console.warn(`Richiesta di rete fallita per: ${event.request.url}. Cerco in cache...`, error);
        
        // Prova a cercare una corrispondenza nella cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              // Trovata in cache, restituisci la versione offline
              console.log('Risorsa trovata in cache (offline):', event.request.url);
              return cachedResponse;
            }

            // Non trovato neanche in cache.
            // Se è una richiesta di navigazione (una pagina HTML),
            // potresti voler mostrare una pagina 'offline.html' generica.
            if (event.request.mode === 'navigate') {
              console.warn('Pagina non trovata in cache, restituisco fallback generico.');
              // return caches.match('/offline.html'); // Decommenta se crei una pagina offline.html
            }

            // Per altre risorse (immagini, script) o se non c'è fallback,
            // l'errore si propagherà al browser.
            console.error('Risorsa non trovata né in rete né in cache:', event.request.url);
            return new Response('Contenuto non disponibile offline.', {
              status: 404,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

/*
  Il vecchio listener 'message' per skipWaiting non è più necessario
  perché ora usiamo self.skipWaiting() direttamente nell'evento 'install'.
*/
// self.addEventListener('message', ...);
