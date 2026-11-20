// ==========================================================
//  BOTÃO "?" DE AJUDA
//   - Pequeno, ao lado de um título:
//       <button type="button" class="ajuda-btn" data-ajuda-titulo="Título" data-ajuda="Texto. | Outra dica.">?</button>
//     (dicas separadas por "|")
//   - Flutuante (páginas públicas):
//       plannexusAjuda.flutuante({ titulo: "...", itens: ["...", "..."] })
// ==========================================================
(function () {
    var caixa = null, aberto = null;

    function esc(t) {
        return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    function fechar() {
        if (caixa) caixa.hidden = true;
        if (aberto) aberto.setAttribute("aria-expanded", "false");
        aberto = null;
    }

    function abrir(botao, titulo, itens) {
        if (aberto === botao) return fechar();
        if (!caixa) {
            caixa = document.createElement("div");
            caixa.className = "ajuda-caixa";
            caixa.setAttribute("role", "dialog");
            document.body.appendChild(caixa);
        }
        caixa.innerHTML = '<button type="button" class="ajuda-fechar" aria-label="Fechar">&times;</button>' +
            '<b>' + esc(titulo || "Ajuda") + '</b>' +
            (itens.length === 1 ? '<span>' + esc(itens[0]) + '</span>' : '<ul>' + itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join("") + '</ul>') +
            '<a href="feedback.html">Não achou o que precisa? Fale com a gente</a>';
        caixa.querySelector(".ajuda-fechar").addEventListener("click", fechar);
        caixa.hidden = false;
        var r = botao.getBoundingClientRect();
        var w = Math.min(320, window.innerWidth - 32);
        var esquerda = Math.max(16, Math.min(r.left, window.innerWidth - w - 16));
        caixa.style.left = esquerda + "px";
        caixa.style.right = "auto";
        if (botao.classList.contains("ajuda-flutuante")) { caixa.style.bottom = (window.innerHeight - r.top + 10) + "px"; caixa.style.top = "auto"; }
        else { caixa.style.top = (r.bottom + 8) + "px"; caixa.style.bottom = "auto"; }
        if (aberto) aberto.setAttribute("aria-expanded", "false");
        aberto = botao;
        botao.setAttribute("aria-expanded", "true");
    }

    document.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest(".ajuda-btn") : null;
        if (b) {
            e.preventDefault();
            var itens = String(b.getAttribute("data-ajuda") || "").split("|").map(function (s) { return s.trim(); }).filter(Boolean);
            if (b._itens) itens = b._itens;
            return abrir(b, b.getAttribute("data-ajuda-titulo") || b._titulo, itens);
        }
        if (aberto && caixa && !caixa.contains(e.target)) fechar();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") fechar(); });

    window.plannexusAjuda = {
        flutuante: function (cfg) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "ajuda-btn ajuda-flutuante";
            b.setAttribute("aria-label", "Ajuda");
            b.setAttribute("aria-expanded", "false");
            b.textContent = "?";
            b._titulo = cfg.titulo;
            b._itens = cfg.itens || [];
            document.body.appendChild(b);
        }
    };
})();
