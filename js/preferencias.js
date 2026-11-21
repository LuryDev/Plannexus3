// Preferências (tema claro/escuro/automático, tamanho da letra, alto contraste, menos movimento).
// Carregado no <head> de todas as páginas: aplica as classes antes de a tela aparecer.
// Fica salvo neste aparelho (localStorage). Em preferencias.html dá para mudar.
(function () {
    var CHAVE = "plannexus_preferencias";
    var PADRAO = { fonte: "normal", contraste: false, movimento: false, tema: "claro" };

    function ler() {
        var p = {};
        try { p = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch (e) { p = {}; }
        return {
            fonte: ["normal", "grande", "maior"].indexOf(p.fonte) > -1 ? p.fonte : PADRAO.fonte,
            contraste: p.contraste === true,
            movimento: p.movimento === true,
            tema: ["claro", "escuro", "auto"].indexOf(p.tema) > -1 ? p.tema : PADRAO.tema
        };
    }

    function aplicar(p) {
        var h = document.documentElement;
        h.classList.remove("fonte-grande", "fonte-maior");
        if (p.fonte === "grande") h.classList.add("fonte-grande");
        if (p.fonte === "maior") h.classList.add("fonte-maior");
        h.classList.toggle("alto-contraste", !!p.contraste);
        h.classList.toggle("menos-movimento", !!p.movimento);
        var escuro = p.tema === "escuro";
        if (p.tema === "auto") {
            try { escuro = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); } catch (e) {}
        }
        h.classList.toggle("tema-escuro", escuro);
    }

    function salvar(p) {
        try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch (e) {}
        aplicar(p);
    }

    // cabeçalhos com fundo degradê (ex.: confirmar, anotações) mantêm a cor da marca no tema escuro
    document.addEventListener("DOMContentLoaded", function () {
        var hs = document.querySelectorAll("header");
        for (var i = 0; i < hs.length; i++) {
            var bi = getComputedStyle(hs[i]).backgroundImage;
            if (bi && bi.indexOf("gradient") > -1) hs[i].classList.add("reinverter");
        }
    });

    window.plannexusPreferencias = { ler: ler, salvar: salvar, aplicar: aplicar, padrao: PADRAO };
    aplicar(ler());
})();
