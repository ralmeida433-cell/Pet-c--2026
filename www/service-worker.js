// SERVICE WORKER - HOTEL PET CÁ
// PWA com suporte offline completo

const CACHE_NAME = 'hotel-pet-v1.0.0';
const RUNTIME_CACHE = 'hotel-pet-runtime';

// Recursos essenciais para cache
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/mobile.css',
    '/css/logo.png',
    '/js/app.js',
    '/js/database.js',
    '/js/dashboard.js',
    '/js/animals.js',
    '/js/reservations.js',
    '/js/kennels.js',
    '/js/inventory.js',
    '/js/reports.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm',
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js'
];

// Assets opcionais (não bloqueiam instalação)
const OPTIONAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js',
    '/js/cadastro_produtos.js',
    '/js/sql.js'
];

// INSTALAÇÃO DO SERVICE WORKER
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cache aberto, adicionando recursos essenciais...');

                // Cache recursos essenciais
                return cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, {
                    cache: 'reload'
                })));
            })
            .then(() => {
                // Cache recursos opcionais sem falhar
                return caches.open(CACHE_NAME).then((cache) => {
                    return Promise.allSettled(
                        OPTIONAL_ASSETS.map(url =>
                            cache.add(new Request(url, { cache: 'reload' }))
                                .catch(err => console.log(`[SW] Falha ao cachear ${url}:`, err))
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Todos os recursos em cache!');
                return self.skipWaiting(); // Ativa imediatamente
            })
            .catch((error) => {
                console.error('[SW] Erro durante instalação:', error);
            })
    );
});

// ATIVAÇÃO DO SERVICE WORKER
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Remove caches antigos
                        if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('[SW] Removendo cache antigo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker ativado!');
                return self.clients.claim(); // Controla todas as páginas imediatamente
            })
    );
});

// ESTRATÉGIAS DE CACHE
// 1. Cache First (para assets estáticos)
const cacheFirst = async (request) => {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        console.error('[SW] Cache First falhou:', error);
        throw error;
    }
};

// 2. Network First (para APIs e dados dinâmicos)
const networkFirst = async (request) => {
    try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) {
            console.log('[SW] Usando versão em cache (offline)');
            return cached;
        }
        throw error;
    }
};

// 3. Stale While Revalidate (para recursos que podem ser atualizados)
const staleWhileRevalidate = async (request) => {
    const cached = await caches.match(request);

    const fetchPromise = fetch(request).then((response) => {
        const cache = caches.open(RUNTIME_CACHE);
        cache.then((c) => c.put(request, response.clone()));
        return response;
    });

    return cached || fetchPromise;
};

// INTERCEPTAÇÃO DE REQUISIÇÕES
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições não-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignora chrome-extension e outros protocolos
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Estratégia baseada no tipo de recurso
    if (url.origin === location.origin) {
        // Recursos locais
        if (url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.woff2')) {
            // Cache First para assets estáticos
            event.respondWith(cacheFirst(request));
        } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
            // Network First para HTML (sempre busca a versão mais recente)
            event.respondWith(networkFirst(request));
        } else {
            // Stale While Revalidate para outros recursos
            event.respondWith(staleWhileRevalidate(request));
        }
    } else {
        // Recursos externos (CDN, fontes, etc)
        event.respondWith(cacheFirst(request));
    }
});

// SINCRONIZAÇÃO EM BACKGROUND
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        // Implementar lógica de sincronização de dados quando online
        console.log('[SW] Sincronizando dados...');
        // Aqui você pode sincronizar dados salvos offline com o servidor
    } catch (error) {
        console.error('[SW] Erro na sincronização:', error);
    }
}

// NOTIFICAÇÕES PUSH
self.addEventListener('push', (event) => {
    console.log('[SW] Push recebido:', event);

    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Hotel Pet CÁ';
    const options = {
        body: data.body || 'Nova notificação',
        icon: '/css/logo.png',
        badge: '/css/logo.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: data.actions || []
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// CLIQUE EM NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event);

    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});

// MENSAGENS DO APP
self.addEventListener('message', (event) => {
    console.log('[SW] Mensagem recebida:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(RUNTIME_CACHE)
                .then((cache) => cache.addAll(event.data.urls))
        );
    }

    if (event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});

// DETECÇÃO DE CONECTIVIDADE
let isOnline = true;

self.addEventListener('online', () => {
    console.log('[SW] Aplicativo online');
    isOnline = true;
    // Tentar sincronizar dados pendentes
    self.registration.sync.register('sync-data');
});

self.addEventListener('offline', () => {
    console.log('[SW] Aplicativo offline');
    isOnline = false;
});

// LIMPEZA PERIÓDICA DE CACHE
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias

async function cleanOldCache() {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    const now = Date.now();

    for (const request of requests) {
        const response = await cache.match(request);
        const dateHeader = response.headers.get('date');

        if (dateHeader) {
            const cacheTime = new Date(dateHeader).getTime();
            if (now - cacheTime > CACHE_MAX_AGE) {
                await cache.delete(request);
                console.log('[SW] Cache removido (expirado):', request.url);
            }
        }
    }
}

// Executar limpeza a cada 24 horas
setInterval(cleanOldCache, 24 * 60 * 60 * 1000);

console.log('[SW] Service Worker carregado e pronto!');
