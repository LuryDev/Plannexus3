// ==========================================================
//  js/leitorTela.js  -  acessibilidade para leitor de tela (TalkBack) e para toque
//
//  1) Botões/links que só têm ícone ganham um nome falado (aria-label).
//  2) Ícones decorativos (Font Awesome) ficam "mudos" para o leitor de tela.
//  3) Mensagens de erro/sucesso são lidas em voz alta quando aparecem (role="status"/"alert").
//  4) Botões de filtro dizem se estão ativos (aria-pressed).
//  5) Botões menores que 44x44 px ganham uma área de toque de 44x44 px, SEM mudar o visual.
//
//  Funciona em todas as páginas (inclusive nas que o app monta depois, via JS).
//  Para ajustar os nomes falados, edite NOMES abaixo. Sem sintaxe nova (WebView antigo).
// ==========================================================
(function () {
    "use strict";

    var ALVO_MINIMO = 44;                      // px (recomendação do WCAG / Material)

    // nome falado por classe, para botões que só têm ícone e não têm "title"
    var NOMES = [
        ["voltar", "Voltar"], ["fechar", "Fechar"], ["excluir", "Excluir"], ["remover", "Remover"],
        ["editar", "Editar"], ["baixar", "Baixar"], ["compartilhar", "Compartilhar"],
        ["ajuda-btn", "Ajuda"], ["abrirEvento", "Ver evento"], ["notification", "Notificações"],
        ["check", "Marcar como feita"], ["prox", "Próximo banner"], ["esquerda", "Anterior"],
        ["direita", "Próximo"], ["add", "Criar evento"]
    ];

    // mensagens que o leitor de tela deve ler quando o texto mudar
    var MENSAGENS = ["mensagem", "aviso", "avisoSug", "mensagemCriar", "pixConfirmaMsg",
                     "pixAviso", "sugMsg", "erroPush"];

    var SELETOR_CLICAVEL = "button,a[href],[role=button]";

    function temNome(el) {
        if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return true;
        if ((el.textContent || "").replace(/\s+/g, "")) return true;
        var img = el.querySelector("img[alt]");
        return !!(img && img.getAttribute("alt"));
    }

    function nomeDoBotao(el) {
        var titulo = el.getAttribute("title");
        if (titulo) return titulo;
        var i;
        for (i = 0; i < NOMES.length; i++) {
            if (el.classList.contains(NOMES[i][0])) return NOMES[i][1];
        }
        if (el.id === "perfil") return "Meu perfil";
        return "";
    }

    function ajustarNomes() {
        var lista = document.querySelectorAll(SELETOR_CLICAVEL), i, el, nome;
        for (i = 0; i < lista.length; i++) {
            el = lista[i];
            if (temNome(el)) continue;
            nome = nomeDoBotao(el);
            if (nome) el.setAttribute("aria-label", nome);
        }
        // bolinhas do carrossel: "Ir para o banner N"
        var pts = document.querySelectorAll("button.pt:not([aria-label])");
        for (i = 0; i < pts.length; i++) pts[i].setAttribute("aria-label", "Ir para o banner " + (i % 3 + 1));
    }

    function esconderIcones() {
        var ic = document.querySelectorAll("i[class*='fa-']:not([aria-hidden])"), i;
        for (i = 0; i < ic.length; i++) ic[i].setAttribute("aria-hidden", "true");
    }

    function avisosEmVozAlta() {
        var i, el;
        for (i = 0; i < MENSAGENS.length; i++) {
            el = document.getElementById(MENSAGENS[i]);
            if (!el || el.getAttribute("role") || el.getAttribute("aria-live")) continue;
            el.setAttribute("role", /erro/i.test(MENSAGENS[i]) ? "alert" : "status");
        }
    }

    function estadoDosFiltros() {
        var f = document.querySelectorAll("button.filtro,button.filtroControle"), i;
        for (i = 0; i < f.length; i++) {
            f[i].setAttribute("aria-pressed", f[i].classList.contains("ativo") ? "true" : "false");
        }
    }

    // área de toque de 44x44 sem mudar o desenho: um pseudo-elemento invisível maior que o botão
    function pseudoLivre(el, qual) {
        var c = window.getComputedStyle(el, qual).content;
        return !c || c === "none" || c === "normal";
    }

    function areasDeToque() {
        var lista = document.querySelectorAll(SELETOR_CLICAVEL), i, el, r, cs;
        for (i = 0; i < lista.length; i++) {
            el = lista[i];
            if (el.classList.contains("pt")) continue;                // bolinhas do carrossel (ficariam sobrepostas)
            if (el.classList.contains("alvo-toque") || el.classList.contains("alvo-toque-b")) continue;
            r = el.getBoundingClientRect();
            if (!r.width || !r.height) continue;
            if (r.width >= ALVO_MINIMO && r.height >= ALVO_MINIMO) continue;
            cs = window.getComputedStyle(el);
            if (cs.display === "inline" && el.closest("p,label,li,span")) continue; // link no meio de um texto
            if (cs.overflow !== "visible") continue;                   // o pseudo-elemento seria cortado
            if (pseudoLivre(el, "::after")) el.classList.add("alvo-toque");
            else if (pseudoLivre(el, "::before")) el.classList.add("alvo-toque-b");
            else continue;
            if (cs.position === "static") el.style.position = "relative";
        }
    }

    function tudo() {
        try {
            ajustarNomes(); esconderIcones(); avisosEmVozAlta(); estadoDosFiltros(); areasDeToque();
        } catch (e) { /* acessibilidade nunca pode quebrar a página */ }
    }

    var agendado = null;
    function agendar() {
        if (agendado) return;
        agendado = setTimeout(function () { agendado = null; tudo(); }, 250);
    }

    function iniciar() {
        tudo();
        if (window.MutationObserver) {
            new MutationObserver(agendar).observe(document.body, {
                childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"]
            });
        }
        window.addEventListener("resize", agendar);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
})();
