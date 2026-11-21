// ==========================================================
//  TRANSIÇÕES (js/transicao.js + css/transicao.css)
//
//  confirmarENavegar({ tipo, mensagem, destino });
//
//   tipo  "login" | "cadastro"        -> personagem voa da esquerda p/ direita
//         "evento-criado"             -> personagem sobe até o meio + mensagem
//         "excluir-evento" |
//         "excluir-conta"             -> personagem sugado pela lixeira (efeitos roxos)
//                                        e a mensagem aparece no fim
//         qualquer outro              -> check desenhado (padrão)
//
//  Se quiser trocar alguma por GIF/vídeo, coloque na lista MIDIAS.
//  A duração de cada uma está em css/transicao.css (--transicao-duracao).
// ==========================================================
(function () {
    "use strict";

    // Só use aqui se quiser trocar uma transição por GIF/vídeo. Formato:
    //   "login": { tipo: "video", arquivo: "animacoes/login.mp4" }
    // (o vídeo de abertura intro.mp4 NÃO vai aqui, ele é do splash.js)
    var MIDIAS = {};

    // Imagens do personagem (caminho relativo à página HTML)
    var IMG = {
        voando:      "fotos/piscando.png",     // apontando p/ a direita
        comemorando: "fotos/comemorando.png",
        curioso:     "fotos/curioso.png"
    };

    var SVG_PADRAO =
        '<svg class="transicao-check" viewBox="0 0 52 52" aria-hidden="true">' +
        '<circle class="transicao-circulo" cx="26" cy="26" r="24" fill="none"/>' +
        '<path class="transicao-visto" fill="none" d="M14 27 l8 8 l16 -17"/>' +
        "</svg>";

    var SVG_LIXO =
        '<svg class="lixo-svg" viewBox="0 0 64 72" aria-hidden="true">' +
        '<g class="lixo-tampa"><rect x="8" y="12" width="48" height="7" rx="3.5"/>' +
        '<rect x="24" y="5" width="16" height="8" rx="4"/></g>' +
        '<path class="lixo-corpo" d="M12 24 h40 l-3.5 40 a5 5 0 0 1 -5 4.5 h-23 a5 5 0 0 1 -5 -4.5 z"/>' +
        '<path class="lixo-listras" d="M25 32 v28 M32 32 v28 M39 32 v28"/>' +
        "</svg>";

    var emAndamento = false;
    var CACHE_IMG = [];   // guarda as imagens pré-carregadas (senão o navegador pode descartá-las)

    var REDUZIR = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;

    function lerDuracao(el) {
        var bruto = getComputedStyle(el).getPropertyValue("--transicao-duracao").trim();
        var n = parseFloat(bruto);
        if (!isFinite(n)) return 1400;
        var ms = /ms$/.test(bruto) ? n : /s$/.test(bruto) ? n * 1000 : n;
        if (REDUZIR && REDUZIR.matches) ms = Math.min(ms, 900);   // sem movimento: não precisa esperar tanto
        return ms;
    }

    function particulas(qtd, classe) {
        var html = "";
        for (var i = 0; i < qtd; i++) {
            var ang = (360 / qtd) * i + Math.random() * 20;
            var dist = 90 + Math.random() * 110;
            var tam = 6 + Math.random() * 10;
            var atraso = Math.random() * 300;
            html += '<span class="' + classe + '" style="--ang:' + ang + "deg;--dist:" + dist +
                "px;--tam:" + tam + "px;--atraso:" + atraso + 'ms"></span>';
        }
        return html;
    }

    // ---------- CENAS EM CSS/JS ----------
    var CENAS = {
        "login": cenaVoo,
        "cadastro": cenaVoo,
        "evento-criado": cenaEvento,
        "excluir-evento": cenaLixo,
        "excluir-conta": cenaLixo
    };

    function cenaVoo(palco) {
        var rastros = "";
        for (var i = 0; i < 14; i++) {
            rastros += '<span class="voo-faisca" style="--y:' + (Math.random() * 100 - 50) +
                "px;--atraso:" + (i * 60) + "ms;--tam:" + (5 + Math.random() * 9) + 'px"></span>';
        }
        palco.innerHTML =
            '<div class="voo-onda"></div>' +
            '<div class="voo-linha">' +
              '<div class="voo-trilha"></div>' + rastros +
              '<img class="voo-personagem" alt="" src="' + IMG.voando + '">' +
            "</div>";
    }

    function cenaEvento(palco) {
        palco.innerHTML =
            '<div class="evento-brilho"></div>' +
            '<div class="evento-sobe">' +
              '<div class="evento-explosao">' + particulas(16, "evento-particula") + "</div>" +
              '<img class="evento-personagem" alt="" src="' + IMG.comemorando + '">' +
            "</div>";
    }

    function cenaLixo(palco) {
        palco.innerHTML =
            '<div class="lixo-cena">' +
              '<div class="lixo-brilho"></div>' +
              // redemoinho roxo + partículas sendo sugadas para a boca da lixeira
              '<div class="lixo-succao">' +
                '<span class="lixo-anel"></span><span class="lixo-anel"></span><span class="lixo-anel"></span>' +
                particulas(22, "lixo-particula") +
                '<span class="lixo-pulso"></span>' +
              "</div>" +
              '<div class="lixo-item">' +
                '<img class="lixo-personagem" alt="" src="' + IMG.curioso + '"></div>' +
              '<div class="lixo-lixeira">' + SVG_LIXO + "</div>" +
            "</div>";
    }

    function montarMidia(palco, tipo) {
        var midia = MIDIAS[tipo];

        if (midia && midia.arquivo) {
            if (midia.tipo === "video") {
                var v = document.createElement("video");
                v.className = "transicao-midia";
                v.muted = v.defaultMuted = v.autoplay = v.playsInline = true;
                v.setAttribute("muted", "");
                v.setAttribute("playsinline", "");
                v.src = midia.arquivo;
                palco.innerHTML = "";
                palco.appendChild(v);
                v.addEventListener("error", function () { palco.innerHTML = SVG_PADRAO; });
                return v;
            }
            if (midia.tipo === "gif") {
                var img = document.createElement("img");
                img.className = "transicao-midia";
                img.alt = "";
                img.src = midia.arquivo;
                img.addEventListener("error", function () { palco.innerHTML = SVG_PADRAO; });
                palco.innerHTML = "";
                palco.appendChild(img);
                return null;
            }
        }

        if (CENAS[tipo]) CENAS[tipo](palco);
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

    function precarregar() {
        if (CACHE_IMG.length) return;
        Object.keys(IMG).forEach(function (k) {
            var i = new Image();
            i.src = IMG[k];
            CACHE_IMG.push(i);
        });
        Object.keys(MIDIAS).forEach(function (t) {
            var m = MIDIAS[t];
            if (!m || !m.arquivo) return;
            if (m.tipo === "gif") {
                var g = new Image();
                g.src = m.arquivo;
                CACHE_IMG.push(g);
            } else if (m.tipo === "video") {
                var v = document.createElement("video");
                v.preload = "auto"; v.muted = true; v.src = m.arquivo;
                CACHE_IMG.push(v);
            }
        });
    }
    // começa a carregar logo que a página abre (antes só no "load", e o usuário podia
    // clicar antes disso e ver o personagem aparecer "do nada" no meio da animação)
    precarregar();

    // Espera as imagens da cena ficarem prontas (no máx. 800ms) antes de iniciar a animação,
    // senão o personagem aparece sem tamanho e a animação sai torta.
    function aguardarImagens(palco, pronto) {
        var imgs = palco.querySelectorAll("img");
        var pendentes = 0;
        var feito = false;
        function fim() { if (feito) return; feito = true; pronto(); }
        Array.prototype.forEach.call(imgs, function (img) {
            if (img.complete && img.naturalWidth) return;
            pendentes++;
            var contou = false;
            function ok() {
                if (contou) return;
                contou = true;
                if (--pendentes <= 0) fim();
            }
            img.addEventListener("load", ok);
            img.addEventListener("error", ok);
        });
        if (!pendentes) fim();
        else setTimeout(fim, 800);
    }

    function limparOverlay() {
        var antigo = document.getElementById("transicao-confirmacao");
        if (antigo) {
            if (antigo._pontos) clearInterval(antigo._pontos);
            antigo.remove();
        }
        document.documentElement.classList.remove("transicao-aberta");
    }

    // Voltou pela seta "voltar" do navegador? Limpa a transição que ficou na tela.
    window.addEventListener("pageshow", function (e) {
        if (!e.persisted) return;
        limparOverlay();
        emAndamento = false;
    });

    window.confirmarENavegar = function (opcoes) {
        var o = opcoes || {};
        var destino = o.destino;
        if (!destino || emAndamento) return;
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
        document.documentElement.classList.add("transicao-aberta");

        aguardarImagens(montado.palco, function () {
            void overlay.offsetWidth;
            overlay.classList.add("ativa");

            if (video) {
                video.addEventListener("ended", navegar);
                var p = video.play();
                if (p && p.catch) p.catch(function () {});
            }
            setTimeout(navegar, lerDuracao(overlay));
        });
    };
})();
