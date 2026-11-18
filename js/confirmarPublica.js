// ==========================================================
//  PÁGINA PÚBLICA DE CONFIRMAÇÃO DE PRESENÇA  (confirmar.html?c=CODIGO)
//  Fala só com /api/presenca (sem login, sem Firestore direto).
// ==========================================================
(function () {
    var codigo = new URLSearchParams(window.location.search).get("c") || "";

    var nomeEventoEl = document.getElementById("nomeEvento");
    var detalhesEl = document.getElementById("detalhes");
    var form = document.getElementById("form");
    var nomeInput = document.getElementById("nome");
    var emailInput = document.getElementById("email");
    var iscaInput = document.getElementById("site");
    var mensagemEl = document.getElementById("mensagem");
    var confirmarEl = document.getElementById("confirmar");
    var resultadoEl = document.getElementById("resultado");
    var avisoEl = document.getElementById("aviso");

    function esc(t) {
        return String(t == null ? "" : t)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function dataBR(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
        return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
    }

    // código deste aparelho: fica guardado no navegador e impede confirmar de novo daqui
    function codigoDoAparelho() {
        try {
            var salvo = localStorage.getItem("plannexusAparelho");
            if (salvo && /^[A-Za-z0-9_-]{16,64}$/.test(salvo)) return salvo;
            var bytes = new Uint8Array(18);
            (window.crypto || window.msCrypto).getRandomValues(bytes);
            var novo = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
            localStorage.setItem("plannexusAparelho", novo);
            return novo;
        } catch (e) {
            return "";   // sem armazenamento: só o e-mail bloqueia
        }
    }

    var aparelho = codigoDoAparelho();

    function chamar(corpo) {
        corpo.token = codigo;
        corpo.dispositivo = aparelho;
        return fetch("/api/presenca", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo)
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (dados) {
                return { ok: r.ok, status: r.status, dados: dados };
            });
        });
    }

    function mostrarAviso(texto) {
        avisoEl.textContent = texto;
        avisoEl.className = "aviso erro";
        avisoEl.hidden = false;
    }

    function mostrarDetalhes(d) {
        var linhas = [];
        var quando = [dataBR(d.data), d.horario ? "às " + d.horario : ""].filter(Boolean).join(" ");
        if (quando) linhas.push('<div class="detalhe"><i class="fa-solid fa-calendar-day"></i><span>' + esc(quando) + '</span></div>');
        if (d.local) linhas.push('<div class="detalhe"><i class="fa-solid fa-location-dot"></i><span>' + esc(d.local) + '</span></div>');
        detalhesEl.innerHTML = linhas.join("");
        detalhesEl.hidden = !linhas.length;
    }

    // tela de resultado: "confirmado" ou "já confirmou"
    function mostrarResultado(jaConfirmou, nome) {
        form.hidden = true;
        resultadoEl.hidden = false;
        var icone = document.getElementById("iconeResultado");
        icone.className = "icone-resultado" + (jaConfirmou ? " aviso-ja" : "");
        icone.innerHTML = '<i class="fa-solid ' + (jaConfirmou ? "fa-circle-exclamation" : "fa-circle-check") + '"></i>';
        document.getElementById("tituloResultado").textContent = jaConfirmou ? "Você já confirmou presença!" : "Presença confirmada!";
        document.getElementById("textoResultado").textContent = jaConfirmou
            ? "Sua presença já está na lista de confirmados. Não precisa fazer mais nada. 💜"
            : (nome ? nome + ", " : "") + "sua presença foi registrada. Te esperamos lá! 🎉";
    }

    function carregar() {
        if (!codigo) {
            nomeEventoEl.textContent = "Link inválido";
            mostrarAviso("Esse link não está completo. Peça um novo para quem enviou o convite.");
            return;
        }

        chamar({ acao: "ver" }).then(function (r) {
            if (!r.ok) {
                nomeEventoEl.textContent = "Convite indisponível";
                mostrarAviso(r.dados.erro || "Não foi possível abrir o convite.");
                return;
            }
            nomeEventoEl.textContent = r.dados.evento || "Evento";
            document.title = "Confirmar presença - " + (r.dados.evento || "Plannexus");
            mostrarDetalhes(r.dados);
            if (r.dados.jaConfirmou) return mostrarResultado(true);   // este aparelho já confirmou
            form.hidden = false;
        }).catch(function () {
            nomeEventoEl.textContent = "Sem conexão";
            mostrarAviso("Não foi possível abrir o convite. Verifique a internet e tente de novo.");
        });
    }

    function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }

    function mostrarErro(texto, campo) {
        mensagemEl.className = "mensagem";
        mensagemEl.textContent = texto;
        nomeInput.removeAttribute("aria-invalid");
        emailInput.removeAttribute("aria-invalid");
        if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var nome = nomeInput.value.trim();
        var email = emailInput.value.trim();

        if (nome.length < 2) return mostrarErro("Digite o seu nome.", nomeInput);
        if (!emailOk(email)) return mostrarErro("Digite um e-mail válido.", emailInput);

        mostrarErro("");
        confirmarEl.disabled = true;
        confirmarEl.textContent = "Confirmando...";

        chamar({ acao: "confirmar", nome: nome, email: email, site: iscaInput.value }).then(function (r) {
            if (r.ok) return mostrarResultado(false, nome.split(" ")[0]);
            if (r.status === 409) return mostrarResultado(true);
            mostrarErro(r.dados.erro || "Não foi possível confirmar. Tente de novo.");
        }).catch(function () {
            mostrarErro("Sem conexão. Tente de novo.");
        }).then(function () {
            confirmarEl.disabled = false;
            confirmarEl.textContent = "Confirmar presença";
        });
    });

    carregar();
})();
