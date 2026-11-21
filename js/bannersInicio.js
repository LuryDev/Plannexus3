/* =====================================================================
   BANNERS DO INÍCIO  (carrossel do topo da página inicial)
   ---------------------------------------------------------------------
   Regras:
   - O banner de "Bem-vindo(a)" é sempre o primeiro e não sai daqui.
   - Dá para adicionar até 2 banners novos (no máximo 3 no total, contando
     com o de boas-vindas). Se escrever mais de 2, só os 2 primeiros valem.
   - Um banner novo só entra se tiver uma imagem (e se ela abrir). Sem
     imagem, ele é ignorado.
   - Sem nenhum banner novo: aparece só o de boas-vindas, parado, sem
     botões.
   - Com 1 ou 2 banners novos: o carrossel passa sozinho, sem parar
     (volta ao primeiro depois do último), e tem o botão ">" para passar
     na hora. Os pontinhos também podem ser tocados.
   - Quem ativou "Menos movimento" nas Preferências não tem a troca
     automática; só passa pelo botão.
   ===================================================================== */

var BANNERS_NOVOS = [

    /* ---- BANNER 2 ---------------------------------------------------
       TAMANHO ACEITO (o banner do início tem estas medidas):
         • PC / site ........ 1400 x 380 px  (use 2800 x 760 para ficar nítido)
         • Celular .......... 700 x 330 px   (use 1400 x 660 para ficar nítido)
       Formatos: JPG, PNG ou WebP, até ~300 KB cada.
       "imagem"        -> obrigatória (versão para PC; também serve no celular
                          se não houver "imagemCelular", mas as laterais são cortadas)
       "imagemCelular" -> opcional (versão própria para telas até 768 px)
       "descricao"     -> texto para leitores de tela (acessibilidade)
       "link"          -> opcional: endereço que abre ao tocar no banner
       Exemplo: imagem: "fotos/banner-natal.jpg"
       ------------------------------------------------------------------ */
    { imagem: "fotos/banner-evento-verde-pc.jpg", imagemCelular: "fotos/banner-evento-verde-celular.jpg", descricao: "Um evento mais verde: convite digital e zero desperdício", link: "" },

    /* ---- BANNER 3 ---------------------------------------------------
       Mesmas medidas do banner 2: PC 1400 x 380 px, celular 700 x 330 px.
       ------------------------------------------------------------------ */
    { imagem: "fotos/banner-consumo-consciente-pc.jpg", imagemCelular: "fotos/banner-consumo-consciente-celular.jpg", descricao: "Consumo consciente: prefira copos reutilizáveis, materiais biodegradáveis e itens reaproveitáveis, e descarte os resíduos em locais apropriados", link: "" }
];

var BANNERS_MAXIMO_NOVOS = 2;      // limite: 3 no total (1 de boas-vindas + 2 novos)
var BANNERS_INTERVALO_MS = 5000;   // tempo de cada banner (5 segundos)


/* ===================== daqui para baixo não precisa mexer ===================== */
(function () {
    var base = document.querySelector("section.banner");
    if (!base) return;

    var candidatos = (BANNERS_NOVOS || []).slice(0, BANNERS_MAXIMO_NOVOS).filter(function (b) {
        return b && typeof b.imagem === "string" && b.imagem.trim() !== "";
    });
    if (!candidatos.length) return;   // sem banner novo: fica só o de boas-vindas

    // confere se cada imagem realmente abre; as que falharem são descartadas
    var validos = new Array(candidatos.length);
    var pendentes = candidatos.length;

    candidatos.forEach(function (b, i) {
        var teste = new Image();
        teste.onload = function () { validos[i] = b; fim(); };
        teste.onerror = function () { validos[i] = null; fim(); };
        teste.src = b.imagem.trim();
    });

    function fim() {
        pendentes--;
        if (pendentes === 0) montar(validos.filter(Boolean));
    }

    function linkSeguro(url) {
        url = String(url || "").trim();
        return /^(https?:\/\/|[\w\-./]+\.html?(\?.*)?$)/i.test(url) ? url : "";
    }

    function montar(lista) {
        if (!lista.length) return;

        var estilo = document.createElement("style");
        estilo.textContent =
            ".banner[hidden]{display:none!important}" +
            ".banner.banner-extra::before,.banner.banner-extra::after{display:none}" +
            ".banner.banner-extra a,.banner.banner-extra picture{position:absolute;inset:0;display:block}" +
            ".banner.banner-extra img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;z-index:0;transform:none;animation:none}" +
            ".banner.banner-entra{animation:bannerEntra .55s ease}" +
            "@keyframes bannerEntra{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}" +
            ".banner-ctrl{position:absolute;right:12px;bottom:10px;z-index:20;display:flex;align-items:center;gap:6px;padding:4px 5px 4px 10px;border-radius:999px;background:rgba(25,10,70,.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
            ".banner-ctrl .pt{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.55);cursor:pointer}" +
            ".banner-ctrl .pt.on{background:#fff;width:18px;border-radius:8px}" +
            ".banner-ctrl .prox{width:30px;height:30px;border:0;border-radius:50%;background:rgba(255,255,255,.9);color:#4d2fb8;font-size:22px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
            ".banner-ctrl .prox:active{transform:scale(.92)}" +
            "@media (max-width:768px){.banner-ctrl{top:8px;bottom:auto;right:8px;gap:5px;padding:3px 4px 3px 8px}.banner-ctrl .pt{width:6px;height:6px}.banner-ctrl .pt.on{width:14px}.banner-ctrl .prox{width:24px;height:24px;font-size:18px}}";
        document.head.appendChild(estilo);

        var slides = [base];

        lista.forEach(function (b) {
            var s = document.createElement("section");
            s.className = "banner banner-extra";
            s.hidden = true;

            var pic = document.createElement("picture");
            if (b.imagemCelular && String(b.imagemCelular).trim()) {
                var src = document.createElement("source");
                src.media = "(max-width: 768px)";
                src.srcset = String(b.imagemCelular).trim();
                pic.appendChild(src);
            }
            var img = document.createElement("img");
            img.src = b.imagem.trim();
            img.alt = b.descricao || "";
            pic.appendChild(img);

            var alvo = linkSeguro(b.link);
            if (alvo) {
                var a = document.createElement("a");
                a.href = alvo;
                if (/^https?:/i.test(alvo)) { a.target = "_blank"; a.rel = "noopener"; }
                a.appendChild(pic);
                s.appendChild(a);
            } else {
                s.appendChild(pic);
            }

            slides[slides.length - 1].parentNode.insertBefore(s, slides[slides.length - 1].nextSibling);
            slides.push(s);
        });

        var atual = 0, timer = null;

        slides.forEach(function (s, idx) {
            var c = document.createElement("div");
            c.className = "banner-ctrl";
            c.setAttribute("role", "group");
            c.setAttribute("aria-label", "Controles do carrossel de banners");

            slides.forEach(function (_, j) {
                var p = document.createElement("button");
                p.type = "button";
                p.className = "pt" + (j === idx ? " on" : "");
                p.setAttribute("aria-label", "Ir para o banner " + (j + 1));
                p.addEventListener("click", function () { ir(j, true); });
                c.appendChild(p);
            });

            var n = document.createElement("button");
            n.type = "button";
            n.className = "prox";
            n.setAttribute("aria-label", "Próximo banner");
            n.innerHTML = "&#8250;";
            n.addEventListener("click", function () { ir(atual + 1, true); });
            c.appendChild(n);

            s.appendChild(c);
        });

        function ir(i, manual) {
            atual = (i + slides.length) % slides.length;
            slides.forEach(function (s, k) {
                s.hidden = k !== atual;
                s.classList.remove("banner-entra");
            });
            slides[atual].classList.add("banner-entra");
            if (manual) agendar();
        }

        function semMovimento() {
            return document.documentElement.classList.contains("menos-movimento") ||
                (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
        }

        function agendar() {
            clearTimeout(timer);
            if (semMovimento() || document.hidden) return;
            timer = setTimeout(function () { ir(atual + 1, false); agendar(); }, BANNERS_INTERVALO_MS);
        }

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) clearTimeout(timer); else agendar();
        });

        agendar();
    }
})();
