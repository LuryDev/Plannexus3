// ==========================================================
//  SERVICE WORKER DO PLANNEXUS
//  Único trabalho: mostrar a página offline.html quando o
//  usuário abre o app sem internet. Todo o resto (páginas,
//  CSS, JS, Firebase) continua vindo direto da rede, então
//  você nunca fica preso numa versão antiga do site.
// ==========================================================

const CACHE = "plannexus-offline-v2";   // (o push não usa cache)
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

// ---------- NOTIFICAÇÕES PUSH ----------
// O servidor manda só dados (titulo, corpo, url, tag); aqui montamos a notificação.
self.addEventListener("push", (event) => {
    let dados = {};

    try {
        const bruto = event.data ? event.data.json() : {};
        dados = bruto.data || bruto || {};
    } catch (e) {
        dados = { corpo: event.data ? event.data.text() : "" };
    }

    const titulo = dados.titulo || "Plannexus";

    event.waitUntil(
        self.registration.showNotification(titulo, {
            body: dados.corpo || "",
            icon: "icons/notificacao-icone.png",      // foto do Nexus
            badge: "icons/notificacao-badge.png",     // silhueta do Nexus (ícone pequeno da barra)
            tag: dados.tag || undefined,
            data: { url: dados.url || "/notificacoes.html" }
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const destino = new URL((event.notification.data && event.notification.data.url) || "/notificacoes.html", self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
            for (const janela of janelas) {
                if ("focus" in janela) {
                    janela.navigate(destino).catch(() => {});
                    return janela.focus();
                }
            }
            return self.clients.openWindow(destino);
        })
    );
});

self.addEventListener("fetch", (event) => {
    // Só interfere quando o usuário está abrindo uma página
    if (event.request.mode !== "navigate") return;

    event.respondWith(
        fetch(event.request).catch(() => caches.match("offline.html"))
    );
});
