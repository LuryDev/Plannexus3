// ==========================================================
//  AVISO DE ATUALIZAÇÃO DO APP  (js/atualizacaoApp.js + css/atualizacaoApp.css)
//
//  Mostra, na tela principal, um aviso para quem usa uma versão antiga do
//  app da Play Store. Para pedir uma nova atualização no futuro, basta
//  aumentar VERSAO_MINIMA_APP em js/config.js e publicar o site.
//
//  - Só aparece dentro do app instalado (nunca no navegador).
//  - Fechar o aviso esconde por 24 horas; antes, o Nexus explica por que atualizar.
// ==========================================================
(function () {
    "use strict";

    var LINK_PLAY_STORE = "https://play.google.com/store/apps/details?id=com.lurydev.plannexus";
    var CHAVE_ADIADO = "avisoAtualizacaoAte";
    var UM_DIA = 24 * 60 * 60 * 1000;

    function noAppInstalado() {
        try {
            var standalone = window.matchMedia("(display-mode: standalone)").matches ||
                             window.matchMedia("(display-mode: fullscreen)").matches;

            // o armazenamento é compartilhado com o Chrome; por isso também exigimos a janela do app
            return standalone && localStorage.getItem("ehAppInstalado") === "1";
        } catch (e) {
            return false;
        }
    }

    function desatualizado() {
        var minima = Number(window.VERSAO_MINIMA_APP) || 0;
        var atual = parseInt(localStorage.getItem("versaoApp"), 10) || 0;
        return minima > 0 && atual < minima;
    }

    function adiado() {
        var ate = parseInt(localStorage.getItem(CHAVE_ADIADO), 10) || 0;
        return Date.now() < ate;
    }

    function criarAviso() {
        var cartao = document.createElement("div");
        cartao.className = "aviso-atualizacao";
        cartao.setAttribute("role", "status");
        cartao.innerHTML =
            '<img src="fotos/mascote.png" alt="" class="aviso-atualizacao-nexus">' +
            '<div class="aviso-atualizacao-texto">' +
                '<strong>Há uma versão nova do Plannexus</strong>' +
                '<span>Atualize para evitar problemas.</span>' +
            '</div>' +
            '<a class="aviso-atualizacao-botao" href="' + LINK_PLAY_STORE + '">Atualizar</a>' +
            '<button type="button" class="aviso-atualizacao-fechar" aria-label="Fechar aviso">&times;</button>';

        var app = document.querySelector(".app") || document.body;
        var cabecalho = app.querySelector("header");

        if (cabecalho && cabecalho.parentNode === app) cabecalho.insertAdjacentElement("afterend", cartao);
        else app.insertBefore(cartao, app.firstChild);

        cartao.querySelector(".aviso-atualizacao-fechar").addEventListener("click", function () {
            abrirConversaDoNexus(cartao);
        });
    }

    // antes de fechar, o Nexus explica o que se perde sem atualizar
    function abrirConversaDoNexus(cartao) {
        var fundo = document.createElement("div");
        fundo.className = "pop-atualizacao-fundo";
        fundo.innerHTML =
            '<div class="pop-atualizacao" role="dialog" aria-modal="true" aria-labelledby="tituloAtualizacao">' +
                '<img src="fotos/mascote.png" alt="Nexus" class="pop-atualizacao-nexus">' +
                '<h3 id="tituloAtualizacao">Atualize o aplicativo!</h3>' +
                '<p>Com a versão antiga, você pode ter:</p>' +
                '<ul>' +
                    '<li><i class="fa-solid fa-bug"></i> Erros e travamentos que já foram corrigidos</li>' +
                    '<li><i class="fa-solid fa-bell-slash"></i> Notificações e lembretes dos seus eventos que não chegam</li>' +
                    '<li><i class="fa-solid fa-wand-magic-sparkles"></i> Recursos novos funcionando mal ou nem aparecendo</li>' +
                    '<li><i class="fa-solid fa-mobile-screen"></i> Menos compatibilidade com o seu aparelho</li>' +
                '</ul>' +
                '<a class="pop-atualizacao-principal" href="' + LINK_PLAY_STORE + '">Atualizar agora</a>' +
                '<button type="button" class="pop-atualizacao-depois">Agora não</button>' +
            '</div>';

        document.body.appendChild(fundo);

        function dispensar() {
            try { localStorage.setItem(CHAVE_ADIADO, String(Date.now() + UM_DIA)); } catch (e) { /* segue */ }
            fundo.remove();
            cartao.remove();
        }

        fundo.querySelector(".pop-atualizacao-depois").addEventListener("click", dispensar);
        fundo.addEventListener("click", function (e) {
            if (e.target === fundo) dispensar();
        });
    }

    function iniciar() {
        if (!noAppInstalado() || !desatualizado() || adiado()) return;
        criarAviso();
    }

    // espera a página carregar por inteiro: o js/config.js (com VERSAO_MINIMA_APP) é o último script do corpo
    if (document.readyState === "complete") iniciar();
    else window.addEventListener("load", iniciar);
})();
