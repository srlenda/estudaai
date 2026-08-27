// Service Worker do EstudaAí
//
// Estratégia:
// - Precaching: assets estáticos do build ( Next.js ) são cacheados na instalação.
// - Runtime: 
//   - Navegação (HTML): network-first, fallback para cache (offline).
//   - Assets estáticos (JS/CSS/fontes/imagens): stale-while-revalidate.
//   - API (GET): network-first com fallback de cache (para dados já carregados).
//   - POST/PUT/DELETE: sempre network (não cacheia mutações).
//
// Versão: bump para forçar update do SW.

const SW_VERSION = "v1.0.0";
const STATIC_CACHE = `estudaai-static-${SW_VERSION}`;
const RUNTIME_CACHE = `estudaai-runtime-${SW_VERSION}`;
const OFFLINE_URL = "/offline";

// Assets para precache (serão cacheados na instalação)
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32.png",
  "/apple-touch-icon.png",
];

// Evento de instalação: faz precache dos assets essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // addAll falha individualmente mas tenta todos; usamos put com try/catch
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // ignora falhas individuais
          }
        })
      );
      // Ativa o SW imediatamente (sem esperar todas as abas fecharem)
      await self.skipWaiting();
    })()
  );
});

// Evento de ativação: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      // Assume controle de todas as abas imediatamente
      await self.clients.claim();
    })()
  );
});

// Helper: verifica se é request de API
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// Helper: verifica se é request de navegação (HTML)
function isNavigationRequest(request) {
  return (
    request.mode === "navigate" ||
    (request.method === "GET" &&
      request.headers.get("accept")?.includes("text/html"))
  );
}

// Helper: verifica se é asset estático
function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  );
}

// Estratégia stale-while-revalidate para assets estáticos
async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Estratégia network-first com fallback de cache para navegação
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: tenta cache, depois offline page
    const cached = await cache.match(request);
    if (cached) return cached;
    const offlinePage = await cache.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
    return new Response(
      "<h1>Offline</h1><p>Você está offline. Conecte-se à internet para usar o EstudaAí.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

// Estratégia network-first para API GET (com cache fallback)
async function apiNetworkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: retorna cache se existir, senão erro
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Offline — dados não disponíveis sem conexão." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Evento principal de fetch
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só processa GET; POST/PUT/DELETE vão direto para a rede
  if (request.method !== "GET") return;

  // Ignora requests de outros domínios
  if (url.origin !== self.location.origin) return;

  // Ignora requests de auth (não devem ser cacheados)
  if (url.pathname.startsWith("/api/auth/")) return;

  // Ignora requests do Next.js HMR em desenvolvimento
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (isNavigationRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  } else if (isApiRequest(url)) {
    event.respondWith(apiNetworkFirst(request));
  }
  // Outros requests: deixa o navegador tratar (default)
});

// Evento de mensagem: permite forçar update do SW
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Evento de notificação push (para lembretes em background, futuro)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || "EstudaAí", {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/favicon-32.png",
        tag: data.tag || "estudaai-notification",
      })
    );
  } catch {
    // payload não-JSON: trata como texto
    event.waitUntil(
      self.registration.showNotification("EstudaAí", {
        body: event.data.text(),
        icon: "/icon-192.png",
        badge: "/favicon-32.png",
      })
    );
  }
});

// Click na notificação: foca/abre o app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Se já há uma aba aberta, foca ela
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          return;
        }
      }
      // Senão, abre nova
      await self.clients.openWindow("/");
    })()
  );
});
