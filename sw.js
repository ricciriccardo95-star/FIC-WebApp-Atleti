const CACHE_NAME = 'fic-pwa-cache-v1.60';

// Lista dei file fondamentali dell'applicazione da mettere in cache.
// Aggiungi qui tutte le pagine e le risorse principali della tua PWA.
const urlsToCache = [
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
];

// Evento 'install': viene eseguito quando il service worker viene installato per la prima volta.
// Qui mettiamo in cache tutti i file dell'app shell.
self.addEventListener('install', event => {
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

// Evento 'activate': viene eseguito dopo l'installazione, quando il service worker prende il controllo della pagina.
// Qui eliminiamo le vecchie cache per liberare spazio.
self.addEventListener('activate', event => {
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
    })
  );
});

// Evento 'fetch': intercetta tutte le richieste di rete dalla PWA.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se la risorsa è già in cache, la restituisco subito.
        if (response) {
          return response;
        }

        // Altrimenti, effettuo la richiesta di rete.
        return fetch(event.request).then(
          networkResponse => {
            // Se la richiesta ha successo, la clono e la metto in cache per il futuro.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
  );
});

// Evento 'message': ascolta i messaggi inviati dalla pagina.
// Utilizzato per forzare l'attivazione del nuovo service worker.
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
