// ==========================================================
//  ABERTURA DO APP (js/splash.js)
//  Toca o vídeo ao abrir; ao terminar vai para login ou início.
//  Dois toques/cliques na tela = acelera o vídeo (3x).
//
//  Uso (na página inicial, ex: index.html):
//      <link rel="stylesheet" href="css/transicao.css">
//      <script src="js/splash.js"></script>
//      <script>iniciarSplash();</script>
//
//  Opção aoTerminar: se passar uma função, o splash NÃO navega sozinho;
//  ele some (com fade) e chama a função. Usado no index.html, que já
//  decide sozinho entre "ir para o início" e "mostrar o carrossel".
// ==========================================================
(function () {
    "use strict";

    var CONFIG = {
        video: "animacoes/intro.mp4",
        destinoLogado: "inicio.html",     // <- ajuste para suas páginas
        destinoDeslogado: "login.html",
        velocidadeRapida: 3,
        tempoMaxCarregar: 6000,      // se o vídeo não começar em 6s (rede ruim), segue direto
        aoTerminar: null,
        // ajuste conforme o seu sistema de login:
        estaLogado: function () {
            try { return !!localStorage.getItem("token"); } catch (e) { return false; }
        }
    };

    window.iniciarSplash = function (opcoes) {
        var c = Object.assign({}, CONFIG, opcoes || {});
        var destino = c.estaLogado() ? c.destinoLogado : c.destinoDeslogado;
        var navegou = false;
        var tela = null;
        var video = null;

        // barras do sistema (topo/rodapé do Android) ficam da cor do vídeo enquanto ele toca
        var metaTema = document.querySelector('meta[name="theme-color"]');
        var temaOriginal = metaTema ? metaTema.getAttribute("content") : null;
        if (metaTema) metaTema.setAttribute("content", "#0b0b17");
        function devolverTema() {
            if (metaTema && temaOriginal) metaTema.setAttribute("content", temaOriginal);
        }

        function ir() {
            if (navegou) return;
            navegou = true;
            devolverTema();
            if (typeof c.aoTerminar === "function") {
                // some com fade e devolve o controle para a página
                if (video) { try { video.pause(); } catch (e) {} }
                if (tela) {
                    tela.classList.add("sai");
                    setTimeout(function () { if (tela.parentNode) tela.parentNode.removeChild(tela); }, 450);
                }
                c.aoTerminar();
                return;
            }
            window.location.replace(destino);
        }

        tela = document.createElement("div");
        tela.className = "splash";
        tela.setAttribute("role", "presentation");

        video = document.createElement("video");
        video.className = "splash-video";
        video.src = c.video;
        video.autoplay = true;
        // tenta tocar COM som; se o navegador bloquear, cai para mudo (veja abaixo)
        video.muted = false;
        video.volume = 1;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.preload = "auto";
        video.setAttribute("aria-hidden", "true");

        var dica = document.createElement("div");
        dica.className = "";
        dica.textContent = "";

        tela.appendChild(video);
        tela.appendChild(dica);
        document.body.appendChild(tela);

        video.addEventListener("ended", ir);
        video.addEventListener("error", ir);          // sem vídeo? segue direto
        var p = video.play();
        if (p && p.catch) p.catch(function () {
            // som bloqueado pelo navegador: toca mudo (o vídeo continua) e liga o som no 1º toque
            video.muted = true;
            var p2 = video.play();
            if (p2 && p2.catch) p2.catch(ir);          // nem mudo tocou? segue direto
            function ligarSom() {
                tela.removeEventListener("pointerdown", ligarSom);
                try { video.muted = false; video.volume = 1; } catch (e) {}
            }
            tela.addEventListener("pointerdown", ligarSom);
        });

        // internet lenta: se o vídeo não começar a tocar a tempo, não prende o usuário na tela preta
        var comecou = false;
        video.addEventListener("playing", function () { comecou = true; });
        setTimeout(function () { if (!comecou) ir(); }, c.tempoMaxCarregar);

        // ---- duplo toque / duplo clique ----
        var acelerado = false;
        function acelerar() {
            if (acelerado) return;
            acelerado = true;
            video.playbackRate = c.velocidadeRapida;
            dica.classList.add("some");
        }
        tela.addEventListener("dblclick", acelerar);

        var ultimoToque = 0;
        tela.addEventListener("touchend", function (e) {
            var agora = Date.now();
            if (agora - ultimoToque < 350) { e.preventDefault(); acelerar(); }
            ultimoToque = agora;
        });

        setTimeout(function () { dica.classList.add("some"); }, 3000);
    };
})();
