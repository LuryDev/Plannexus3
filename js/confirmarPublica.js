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
    var iscaInput = document.getElementById("kq7armadilha");
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

    // se quem abriu estiver logado no Plannexus, manda o login (só para reconhecer o organizador)
    function pegarLogin() {
        if (typeof window.plannexusToken !== "function") return Promise.resolve("");
        return Promise.race([
            window.plannexusToken(),
            new Promise(function (ok) { setTimeout(function () { ok(""); }, 3000); })
        ]).catch(function () { return ""; });
    }

    function chamar(corpo, bearer) {
        corpo.token = codigo;
        corpo.dispositivo = aparelho;
        var cab = { "Content-Type": "application/json" };
        if (bearer) cab.Authorization = "Bearer " + bearer;
        return fetch("/api/presenca", {
            method: "POST",
            headers: cab,
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

    // tela de resultado. tipo: "confirmou" | "nao" (não poderá ir) | "ja-sim" | "ja-nao"
    function mostrarResultado(tipo, nome) {
        form.hidden = true;
        resultadoEl.hidden = false;
        var ja = tipo === "ja-sim" || tipo === "ja-nao";
        var recusou = tipo === "nao" || tipo === "ja-nao";
        var icone = document.getElementById("iconeResultado");
        icone.className = "icone-resultado" + (tipo === "ja-sim" ? " aviso-ja" : recusou ? " aviso-nao" : "");
        icone.innerHTML = '<i class="fa-solid ' + (tipo === "ja-sim" ? "fa-circle-exclamation" : recusou ? "fa-envelope-circle-check" : "fa-circle-check") + '"></i>';
        var titulo, texto;
        if (tipo === "ja-sim") {
            titulo = "Você já confirmou presença!";
            texto = "Sua presença já está na lista de confirmados. Não precisa fazer mais nada. 💜";
        } else if (tipo === "ja-nao") {
            titulo = "Você já respondeu!";
            texto = "Você já avisou que não poderá comparecer. Se mudar de ideia, fale com o organizador.";
        } else if (tipo === "nao") {
            titulo = "Que pena!";
            texto = (nome ? nome + ", a" : "A") + "visamos o organizador que você não poderá comparecer. Obrigado por avisar! 💜";
        } else {
            titulo = "Presença confirmada!";
            texto = (nome ? nome + ", " : "") + "sua presença foi registrada. Te esperamos lá! 🎉";
        }
        document.getElementById("tituloResultado").textContent = titulo;
        document.getElementById("textoResultado").textContent = texto;
    }

    function carregar() {
        if (!codigo) {
            nomeEventoEl.textContent = "Link inválido";
            mostrarAviso("Esse link não está completo. Peça um novo para quem enviou o convite.");
            return;
        }

        pegarLogin().then(function (login) {
            return chamar({ acao: "ver" }, login);
        }).then(function (r) {
            if (!r.ok) {
                nomeEventoEl.textContent = "Convite indisponível";
                mostrarAviso(r.dados.erro || "Não foi possível abrir o convite.");
                return;
            }
            nomeEventoEl.textContent = r.dados.evento || "Evento";
            document.title = "Confirmar presença - " + (r.dados.evento || "Plannexus");
            mostrarDetalhes(r.dados);
            if (r.dados.organizador) {   // quem criou o evento: não confirma, vai para a lista
                document.getElementById("irParaLista").href = "convidados.html?id=" + encodeURIComponent(r.dados.eventoId || "");
                document.getElementById("organizador").hidden = false;
                return;
            }
            if (r.dados.jaConfirmou) return mostrarResultado(r.dados.respostaAnterior === "nao" ? "ja-nao" : "ja-sim");   // este aparelho já confirmou
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

    var botaoNao = document.getElementById("naoVou");

    function enviar(resposta) {
        var nome = nomeInput.value.trim();
        var email = emailInput.value.trim();

        if (nome.length < 2) return mostrarErro("Digite o seu nome.", nomeInput);
        if (!emailOk(email)) return mostrarErro("Digite um e-mail válido.", emailInput);

        mostrarErro("");
        confirmarEl.disabled = true;
        botaoNao.disabled = true;
        var botao = resposta === "nao" ? botaoNao : confirmarEl;
        var textoOriginal = botao.textContent;
        botao.textContent = "Enviando...";

        chamar({ acao: "confirmar", resposta: resposta, nome: nome, email: email, armadilha: iscaInput.value }).then(function (r) {
            if (r.ok) return mostrarResultado(resposta === "nao" ? "nao" : "confirmou", nome.split(" ")[0]);
            if (r.status === 409) return mostrarResultado(r.dados.resposta === "nao" ? "ja-nao" : "ja-sim");
            mostrarErro(r.dados.erro || "Não foi possível enviar. Tente de novo.");
        }).catch(function () {
            mostrarErro("Sem conexão. Tente de novo.");
        }).then(function () {
            confirmarEl.disabled = false;
            botaoNao.disabled = false;
            botao.textContent = textoOriginal;
        });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); enviar("sim"); });
    botaoNao.addEventListener("click", function () { enviar("nao"); });

    // scripts do tipo module rodam só depois da leitura da página: espera por eles
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", carregar);
    else carregar();
})();
