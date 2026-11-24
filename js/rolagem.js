// Lembra onde você estava na página e volta para o mesmo ponto ao retornar
// (ex.: abrir Tarefas e voltar para o evento). O conteúdo chega aos poucos,
// então tenta de novo até a página ficar alta o bastante.
(function () {
    var chave = "plannexus_rolagem_" + location.pathname + location.search;
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { /* ok */ }

    function salvar() {
        try { sessionStorage.setItem(chave, String(Math.round(window.scrollY || document.documentElement.scrollTop || 0))); } catch (e) { /* ok */ }
    }
    window.addEventListener("pagehide", salvar);
    document.addEventListener("visibilitychange", function () { if (document.hidden) salvar(); });
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a[href]")) salvar(); }, true);

    var alvo = 0;
    try { alvo = parseInt(sessionStorage.getItem(chave) || "0", 10) || 0; } catch (e) { /* ok */ }
    // chegando da tela inicial (abrindo o evento "do zero"), começa no topo
    if (/inicio\.html/.test(document.referrer) && /evento\.html/.test(location.pathname)) alvo = 0;
    if (!alvo) return;

    var tentativas = 0, mexeu = false;
    window.addEventListener("wheel", function () { mexeu = true; }, { passive: true });
    window.addEventListener("touchstart", function () { mexeu = true; }, { passive: true });

    (function tentar() {
        if (mexeu) return;
        var alturaMax = document.documentElement.scrollHeight - window.innerHeight;
        if (alturaMax >= alvo || tentativas > 40) {
            window.scrollTo(0, Math.min(alvo, Math.max(alturaMax, 0)));
            return;
        }
        tentativas++;
        setTimeout(tentar, 100);
    })();
})();
