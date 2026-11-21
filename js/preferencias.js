// Preferências de acessibilidade (tamanho da letra, alto contraste, menos movimento).
// Carregado no <head> de todas as páginas: aplica as classes antes de a tela aparecer.
// Fica salvo neste aparelho (localStorage). Em preferencias.html dá para mudar.
(function () {
    var CHAVE = "plannexus_preferencias";
    var PADRAO = { fonte: "normal", contraste: false, movimento: false };

    function ler() {
        var p = {};
        try { p = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch (e) { p = {}; }
        return {
            fonte: ["normal", "grande", "maior"].indexOf(p.fonte) > -1 ? p.fonte : PADRAO.fonte,
            contraste: p.contraste === true,
            movimento: p.movimento === true
        };
    }

    function aplicar(p) {
        var h = document.documentElement;
        h.classList.remove("fonte-grande", "fonte-maior");
        if (p.fonte === "grande") h.classList.add("fonte-grande");
        if (p.fonte === "maior") h.classList.add("fonte-maior");
        h.classList.toggle("alto-contraste", !!p.contraste);
        h.classList.toggle("menos-movimento", !!p.movimento);
    }

    function salvar(p) {
        try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) {}
        aplicar(p);
    }

    window.plannexusPreferencias = { ler: ler, salvar: salvar, aplicar: aplicar, padrao: PADRAO };
    aplicar(ler());
})();
