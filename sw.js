// ==========================================================
//  SERVICE WORKER DO PLANNEXUS
//  Único trabalho: mostrar a página offline.html quando o
//  usuário abre o app sem internet. Todo o resto (páginas,
//  CSS, JS, Firebase) continua vindo direto da rede, então
//  você nunca fica preso numa versão antiga do site.
// ==========================================================

const CACHE = "plannexus-offline-v1";
const ARQUIVOS_OFFLINE = ["offline.html", "icons/icon-192.png"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS_OFFLINE))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((nomes) =>
            Promise.all(
                nomes
                    .filter((nome) => nome !== CACHE)
                    .map((nome) => caches.delete(nome))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    // Só interfere quando o usuário está abrindo uma página
    if (event.request.mode !== "navigate") return;

    event.respondWith(
        fetch(event.request).catch(() => caches.match("offline.html"))
    );
});
