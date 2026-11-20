// ==========================================================
//  PÁGINA PÚBLICA DA LISTA DE PRESENTES  (lista.html?c=CODIGO)
//  Fala só com /api/lista (sem login, sem Firestore direto).
// ==========================================================
(function () {
    var codigo = new URLSearchParams(window.location.search).get("c") || "";

    var nomeEventoEl = document.getElementById("nomeEvento");
    var listaEl = document.getElementById("lista");
    var introEl = document.getElementById("intro");
    var modal = document.getElementById("modal");
    var form = document.getElementById("form");
    var nomeInput = document.getElementById("nome");
    var anonimoInput = document.getElementById("anonimo");
    var mensagemEl = document.getElementById("mensagem");
    var confirmarEl = document.getElementById("confirmar");
    var toastEl = document.getElementById("toast");

    var presenteAtual = null;
    var pixCartao = document.getElementById("pixCartao");
    var pixAvisado = false;

    function esc(t) {
        return String(t == null ? "" : t)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function dinheiro(v) {
        return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function toast(texto) {
        toastEl.textContent = texto;
        toastEl.hidden = false;
        setTimeout(function () { toastEl.hidden = true; }, 4500);
    }

    function chamar(corpo) {
        corpo.token = codigo;
        return fetch("/api/lista", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo)
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (dados) {
                return { ok: r.ok, status: r.status, dados: dados };
            });
        });
    }

    function desenhar(presentes) {
        if (!presentes.length) {
            listaEl.innerHTML = '<p class="aviso">Essa lista ainda não tem presentes.</p>';
            introEl.hidden = true;
            return;
        }

        introEl.hidden = false;
        listaEl.innerHTML = "";

        presentes.forEach(function (p) {
            var card = document.createElement("div");
            card.className = "presente" + (p.escolhido ? " escolhido" : "");

            card.innerHTML =
                '<div class="presente-topo">' +
                    '<div class="icone"><i class="fa-solid fa-gift"></i></div>' +
                    '<div class="info">' +
                        '<h3>' + esc(p.nome) + '</h3>' +
                        (p.observacao ? '<p>' + esc(p.observacao) + '</p>' : "") +
                        (p.link ? '<a href="' + esc(p.link) + '" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> Ver na loja</a>' : "") +
                    '</div>' +
                    (p.valor > 0 ? '<span class="valor">' + esc(dinheiro(p.valor)) + '</span>' : "") +
                '</div>' +
                (p.escolhido
                    ? '<div class="tag-escolhido"><i class="fa-solid fa-check"></i> Já escolhido</div>'
                    : '<button type="button" class="botao-dar">Eu vou dar este presente!</button>');

            if (!p.escolhido) {
                card.querySelector(".botao-dar").addEventListener("click", function () { abrirModal(p); });
            }

            listaEl.appendChild(card);
        });
    }

    // ---------- Pix ----------
    function desenharPix(pix) {
        if (!pix) { pixCartao.hidden = true; return; }
        document.getElementById("pixPara").textContent = pix.favorecido ? "Para " + pix.favorecido + " (" + pix.tipo + ")" : pix.tipo;
        document.getElementById("pixChave").textContent = pix.chave;
        pixCartao.hidden = false;
        pixCartao._chave = pix.chave;
    }

    document.getElementById("pixCopiar").addEventListener("click", function () {
        var chave = pixCartao._chave || "";
        if (!chave) return;
        var ok = function () { toast("Chave Pix copiada! 💜"); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(chave).then(ok, function () { window.prompt("Copie a chave Pix:", chave); });
        else window.prompt("Copie a chave Pix:", chave);
    });

    document.getElementById("pixJa").addEventListener("click", function () {
        document.getElementById("pixForm").hidden = false;
        this.hidden = true;
        document.getElementById("pixNome").focus();
    });

    document.getElementById("pixAnonimo").addEventListener("change", function () {
        var n = document.getElementById("pixNome");
        n.disabled = this.checked;
        if (this.checked) n.value = "";
    });

    document.getElementById("pixForm").addEventListener("submit", function (e) {
        e.preventDefault();
        if (pixAvisado) return;
        var msg = document.getElementById("pixMensagem");
        var anonimo = document.getElementById("pixAnonimo").checked;
        var nome = document.getElementById("pixNome").value.trim();
        var bruto = document.getElementById("pixValor").value.trim().replace(/[^\d,.]/g, "");
        // "1.234,50" -> 1234.50 ; "100" -> 100
        var valor = bruto ? Number(bruto.indexOf(",") > -1 ? bruto.replace(/\./g, "").replace(",", ".") : bruto) : 0;
        if (!anonimo && nome.length < 2) { msg.textContent = "Digite seu nome ou marque a opção de ficar anônimo."; return; }
        if (!(valor >= 0) || valor > 100000) { msg.textContent = "Confira o valor digitado."; return; }
        var botao = document.getElementById("pixEnviar");
        botao.disabled = true; botao.textContent = "Enviando...";
        chamar({ acao: "pixavisar", nome: nome, anonimo: anonimo, valor: valor, armadilha: document.getElementById("pixIsca").value }).then(function (r) {
            if (r.ok) {
                pixAvisado = true;
                document.getElementById("pixForm").hidden = true;
                document.getElementById("pixOk").hidden = false;
                return;
            }
            msg.textContent = r.dados.erro || "Não foi possível avisar. Tente de novo.";
        }).catch(function () {
            msg.textContent = "Sem conexão. Tente de novo.";
        }).then(function () { botao.disabled = false; botao.textContent = "Avisar o organizador"; });
    });

    function carregar() {
        if (!codigo) {
            nomeEventoEl.textContent = "Link inválido";
            listaEl.innerHTML = '<p class="aviso erro">Esse link não está completo. Peça um novo para quem enviou.</p>';
            return Promise.resolve();
        }

        return chamar({ acao: "ver" }).then(function (r) {
            if (!r.ok) {
                nomeEventoEl.textContent = "Lista indisponível";
                listaEl.innerHTML = '<p class="aviso erro">' + esc(r.dados.erro || "Não foi possível abrir a lista.") + '</p>';
                return;
            }
            nomeEventoEl.textContent = r.dados.evento || "Evento";
            document.title = "Lista de presentes - " + (r.dados.evento || "Plannexus");
            desenharPix(r.dados.pix || null);
            desenhar(r.dados.presentes || []);
        }).catch(function () {
            listaEl.innerHTML = '<p class="aviso erro">Sem conexão. Tente de novo.</p>';
        });
    }

    function abrirModal(p) {
        presenteAtual = p;
        form.reset();
        nomeInput.disabled = false;
        mensagemEl.textContent = "";
        document.getElementById("qualPresente").textContent = p.nome;
        modal.hidden = false;
        nomeInput.focus();
    }

    function fecharModal() { modal.hidden = true; presenteAtual = null; }

    document.getElementById("cancelar").addEventListener("click", fecharModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) fecharModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) fecharModal(); });

    anonimoInput.addEventListener("change", function () {
        nomeInput.disabled = anonimoInput.checked;
        if (anonimoInput.checked) nomeInput.value = "";
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!presenteAtual) return;

        var anonimo = anonimoInput.checked;
        var nome = nomeInput.value.trim();

        if (!anonimo && nome.length < 2) {
            mensagemEl.textContent = "Digite seu nome ou marque a opção de ficar anônimo.";
            return;
        }

        confirmarEl.disabled = true;
        confirmarEl.textContent = "Confirmando...";

        var escolhido = presenteAtual;

        chamar({ acao: "escolher", presenteId: escolhido.id, nome: nome, anonimo: anonimo }).then(function (r) {
            if (r.ok) {
                fecharModal();
                toast("Obrigado! Você vai dar \"" + escolhido.nome + "\". 💜");
                return carregar();
            }
            if (r.status === 409 || r.status === 404) {
                fecharModal();
                toast(r.dados.erro || "Esse presente não está mais disponível.");
                return carregar();
            }
            mensagemEl.textContent = r.dados.erro || "Não foi possível confirmar. Tente de novo.";
        }).catch(function () {
            mensagemEl.textContent = "Sem conexão. Tente de novo.";
        }).then(function () {
            confirmarEl.disabled = false;
            confirmarEl.textContent = "Confirmar";
        });
    });

    carregar();
})();
