// ==========================================================
//  TRANSIÇÃO DE CONFIRMAÇÃO  (js/transicao.js + css/transicao.css)
//
//  Ponto único de entrada para "deu certo, vamos para a próxima tela".
//  Todas as telas chamam:
//
//      confirmarENavegar({ tipo, mensagem, destino });
//
//   tipo      "login" | "cadastro" | "evento-criado"
//             (vira data-tipo no overlay, para o CSS escolher a animação)
//   mensagem  texto mostrado durante a animação
//   destino   página para onde ir quando a animação terminar
//
//  QUEM FOR FAZER A ANIMAÇÃO mexe em css/transicao.css (animação em CSS)
//  e/ou na lista MIDIAS logo abaixo (animação em GIF ou vídeo).
//  Guia completo: "manu design guia".
//
//   - a duração vem da variável CSS --transicao-duracao (o JS lê o valor);
//   - o palco da animação é o elemento #animacao-confirmacao;
//   - eventos disponíveis no document: "transicao:inicio" e "transicao:fim"
//     (event.detail = { tipo, mensagem, destino }).
// ==========================================================

(function () {
    "use strict";

    // ------------------------------------------------------------------
    //  ANIMAÇÃO EM GIF OU VÍDEO (opcional, por tipo)
    //
    //  Coloque os arquivos na pasta animacoes/ e liste aqui. Exemplo:
    //
    //    "login":         { tipo: "video", arquivo: "animacoes/login.mp4" },
    //    "cadastro":      { tipo: "gif",   arquivo: "animacoes/cadastro.gif" },
    //    "evento-criado": { tipo: "video", arquivo: "animacoes/evento.webm" },
    //
    //  Tipo sem entrada aqui usa a animação em CSS (check desenhado).
    //  Vídeo: a página muda quando o vídeo termina (ou no tempo de
    //         --transicao-duracao, o que vier primeiro).
    //  GIF:   a página muda quando passar o tempo de --transicao-duracao.
    // ------------------------------------------------------------------
    var MIDIAS = {
    };

    var SVG_PADRAO =
        '<svg class="transicao-check" viewBox="0 0 52 52" aria-hidden="true">' +
        '<circle class="transicao-circulo" cx="26" cy="26" r="24" fill="none"/>' +
        '<path class="transicao-visto" fill="none" d="M14 27 l8 8 l16 -17"/>' +
        "</svg>";

    var emAndamento = false;

    function lerDuracao(elemento) {
        var bruto = getComputedStyle(elemento).getPropertyValue("--transicao-duracao").trim();
        var numero = parseFloat(bruto);

        if (!isFinite(numero)) return 1400;

        // aceita "1400ms" ou "1.4s"
        return /ms$/.test(bruto) ? numero : /s$/.test(bruto) ? numero * 1000 : numero;
    }

    // Coloca no palco o GIF ou o vídeo do tipo (se houver). Devolve o <video> ou null.
    function montarMidia(palco, tipo) {
        var midia = MIDIAS[tipo];

        if (!midia || !midia.arquivo) return null;

        if (midia.tipo === "video") {
            var video = document.createElement("video");
            video.className = "transicao-midia";
            video.muted = true;
            video.defaultMuted = true;
            video.autoplay = true;
            video.playsInline = true;
            video.setAttribute("muted", "");
            video.setAttribute("playsinline", "");
            video.src = midia.arquivo;

            palco.innerHTML = "";
            palco.appendChild(video);

            // se o vídeo não carregar, volta para o check padrão
            video.addEventListener("error", function () {
                palco.innerHTML = SVG_PADRAO;
            });

            return video;
        }

        if (midia.tipo === "gif") {
            var img = document.createElement("img");
            img.className = "transicao-midia";
            img.alt = "";
            img.src = midia.arquivo;
            img.addEventListener("error", function () {
                palco.innerHTML = SVG_PADRAO;
            });

            palco.innerHTML = "";
            palco.appendChild(img);
        }

        return null;
    }

    function criarOverlay(tipo, mensagem) {
        var overlay = document.createElement("div");
        overlay.id = "transicao-confirmacao";
        overlay.className = "transicao";
        overlay.setAttribute("data-tipo", tipo);
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");

        var palco = document.createElement("div");
        palco.id = "animacao-confirmacao";
        palco.className = "transicao-palco";
        palco.innerHTML = SVG_PADRAO;

        var texto = document.createElement("p");
        texto.className = "transicao-mensagem";
        texto.textContent = mensagem || "";

        overlay.appendChild(palco);
        overlay.appendChild(texto);
        document.body.appendChild(overlay);

        return { overlay: overlay, palco: palco };
    }

    // Baixa GIFs e vídeos antes, para a animação começar sem atraso.
    function precarregar() {
        Object.keys(MIDIAS).forEach(function (tipo) {
            var midia = MIDIAS[tipo];
            if (!midia || !midia.arquivo) return;

            if (midia.tipo === "gif") {
                new Image().src = midia.arquivo;
            } else if (midia.tipo === "video") {
                var v = document.createElement("video");
                v.preload = "auto";
                v.muted = true;
                v.src = midia.arquivo;
            }
        });
    }

    window.addEventListener("load", precarregar);

    window.confirmarENavegar = function (opcoes) {
        var o = opcoes || {};
        var destino = o.destino;

        if (!destino) return;
        if (emAndamento) return;
        emAndamento = true;

        var tipo = o.tipo || "padrao";
        var mensagem = o.mensagem || "";
        var montado = criarOverlay(tipo, mensagem);
        var overlay = montado.overlay;
        var video = montarMidia(montado.palco, tipo);
        var detalhe = { tipo: tipo, mensagem: mensagem, destino: destino };
        var navegou = false;

        function navegar() {
            if (navegou) return;
            navegou = true;

            document.dispatchEvent(new CustomEvent("transicao:fim", { detail: detalhe }));
            window.location.href = destino;
        }

        document.dispatchEvent(new CustomEvent("transicao:inicio", { detail: detalhe }));

        // força o navegador a pintar o estado inicial antes de ativar a animação
        void overlay.offsetWidth;
        overlay.classList.add("ativa");

        // vídeo: vai para a próxima página assim que ele termina
        if (video) {
            video.addEventListener("ended", navegar);
            var tocar = video.play();
            if (tocar && tocar.catch) tocar.catch(function () { /* o tempo máximo abaixo cuida */ });
        }

        // tempo máximo (e tempo normal para CSS/GIF)
        setTimeout(navegar, lerDuracao(overlay));
    };
})();
