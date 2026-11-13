// ==========================================================
//  REGISTRO DO SERVICE WORKER (PWA)
//  Carregado em todas as páginas com <script src="js/pwa.js" defer>
//  Só funciona em https:// (ou localhost), que é onde o site
//  publicado roda.
// ==========================================================

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        navigator.serviceWorker
            .register("sw.js")
            .catch(function (erro) {
                console.warn("Service worker não registrado:", erro);
            });
    });
}
