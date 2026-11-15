// ==========================================================
//  NEXUS FLUTUANTE  (js/nexusFlutuante.js + css/nexusFlutuante.css)
//
//  Botão do Nexus no canto inferior direito. Ao tocar, abre um chat de
//  AJUDA: o Nexus explica como usar o app, para que serve cada ferramenta
//  e leva o usuário até a página certa (quando ele pede).
//
//  Como usar numa página (no fim do <body>, depois do js/config.js):
//      <link rel="stylesheet" href="css/nexusFlutuante.css">
//      <script type="module" src="js/nexusFlutuante.js"></script>
//
//  O servidor (/api/nexus, modo "ajuda") só devolve um CÓDIGO de destino;
//  o endereço real sai da tabela DESTINOS abaixo (a IA nunca escolhe links).
//  Códigos e tabela precisam bater com DESTINOS em api/nexus.js.
// ==========================================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { anexarReporte } from "./reportarResposta.js";

// ---------- onde o usuário está ----------

const ARQUIVO_PARA_PAGINA = {
    "inicio.html": "inicio",
    "indexAdmin.html": "inicio",
    "evento.html": "evento",
    "tarefas.html": "tarefas",
    "calendario.html": "calendario",
    "controleFinanceiro.html": "financeiro",
    "blocoNotas.html": "notas",
    "presentes.html": "presentes",
    "pessoas.html": "pessoas",
    "notificacoes.html": "notificacoes",
    "perfilPessoal.html": "perfil",
    "perfilPessoalAdmin.html": "perfil",
    "feedback.html": "feedback"
};

const PAGINAS_DE_EVENTO = ["evento", "tarefas", "calendario", "financeiro", "notas", "presentes", "pessoas"];

// ---------- código de destino -> endereço ----------
// evento: true  = precisa do ?id= do evento aberto
const DESTINOS = {
    "inicio":        { nome: "Início",              url: "inicio.html",            admin: "indexAdmin.html" },
    "criar-evento":  { nome: "Criar evento",        url: "criarEvento.html",       admin: "criarEventoAdmin.html" },
    "nexus-criar":   { nome: "Criar com o Nexus",   url: "nexus.html" },
    "notificacoes":  { nome: "Notificações",        url: "notificacoes.html" },
    "perfil":        { nome: "Perfil",              url: "perfilPessoal.html",     admin: "perfilPessoalAdmin.html" },
    "feedback":      { nome: "Enviar feedback",     url: "feedback.html" },
    "privacidade":   { nome: "Política de Privacidade", url: "privacidade.html" },
    "excluir-conta": { nome: "Excluir conta",       url: "excluir-conta.html" },
    "evento":        { nome: "Página do evento",    url: "evento.html",            evento: true },
    "tarefas":       { nome: "Tarefas",             url: "tarefas.html",           evento: true },
    "calendario":    { nome: "Calendário",          url: "calendario.html",        evento: true },
    "financeiro":    { nome: "Controle financeiro", url: "controleFinanceiro.html", evento: true },
    "notas":         { nome: "Bloco de notas",      url: "blocoNotas.html",        evento: true },
    "presentes":     { nome: "Lista de presentes",  url: "presentes.html",         evento: true },
    "pessoas":       { nome: "Adicionar pessoas",   url: "pessoas.html",           evento: true }
};

// Devolve { nome, url } ou null. Nunca devolve endereço que não esteja na tabela.
export function resolverDestino(codigo, { eventoId, admin }) {
    if (typeof codigo !== "string" || !Object.prototype.hasOwnProperty.call(DESTINOS, codigo)) return null;

    let d = DESTINOS[codigo];

    // página de evento sem evento aberto: leva para o início
    if (d.evento && !eventoId) d = DESTINOS["inicio"];

    let url = admin && d.admin ? d.admin : d.url;

    if (d.evento && eventoId) url += "?id=" + encodeURIComponent(eventoId);

    return { nome: d.nome, url };
}

export function paginaAtual(caminho) {
    const arquivo = String(caminho || "").split("/").pop() || "";
    return ARQUIVO_PARA_PAGINA[arquivo] || "outra";
}

// ---------- só roda no navegador ----------

if (typeof document !== "undefined") {

    const app  = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);

    const pagina   = paginaAtual(window.location.pathname);
    const eventoId = PAGINAS_DE_EVENTO.includes(pagina)
        ? new URLSearchParams(window.location.search).get("id")
        : null;

    let usuario   = null;
    let historico = [];
    let aguardando = false;
    let montado   = false;

    const SUGESTOES = [
        "Como crio um evento?",
        "Para que serve cada ferramenta?",
        "Como convido alguém?"
    ];

    function elemento(tag, classe, texto) {
        const el = document.createElement(tag);
        if (classe) el.className = classe;
        if (texto) el.textContent = texto;
        return el;
    }

    function montar() {
        if (montado) return;
        montado = true;

        const botao = elemento("button", "nxf-botao");
        botao.type = "button";
        botao.setAttribute("aria-label", "Abrir o assistente Nexus");
        const icone = document.createElement("img");
        icone.src = "fotos/mascote.png";
        icone.alt = "";
        botao.appendChild(icone);

        const fundo = elemento("div", "nxf-fundo");
        fundo.hidden = true;

        const painel = elemento("div", "nxf-painel");
        painel.setAttribute("role", "dialog");
        painel.setAttribute("aria-label", "Ajuda do Nexus");

        const topo = elemento("div", "nxf-topo");
        const avatar = document.createElement("img");
        avatar.src = "fotos/mascote.png";
        avatar.alt = "";
        const textoTopo = elemento("div", "nxf-topo-texto");
        textoTopo.appendChild(elemento("strong", "", "Nexus"));
        textoTopo.appendChild(elemento("span", "", "Assistente do Plannexus"));
        const fechar = elemento("button", "nxf-fechar", "✕");
        fechar.type = "button";
        fechar.setAttribute("aria-label", "Fechar");
        topo.append(avatar, textoTopo, fechar);

        const conversa = elemento("div", "nxf-conversa");

        const aviso = elemento("p", "nxf-aviso", "O Nexus usa IA e pode errar. Confira as informações importantes.");

        const form = elemento("form", "nxf-form");
        const campo = elemento("input", "nxf-campo");
        campo.type = "text";
        campo.maxLength = 500;
        campo.placeholder = "Pergunte como usar o app...";
        campo.autocomplete = "off";
        const enviar = elemento("button", "nxf-enviar", "➤");
        enviar.type = "submit";
        enviar.setAttribute("aria-label", "Enviar");
        form.append(campo, enviar);

        painel.append(topo, conversa, aviso, form);
        fundo.appendChild(painel);
        document.body.append(botao, fundo);

        // ---------- conversa ----------

        function rolar() {
            conversa.scrollTop = conversa.scrollHeight;
        }

        function balao(texto, quem, erro) {
            const b = elemento("div", "nxf-balao nxf-balao-" + quem + (erro ? " nxf-balao-erro" : ""), texto);
            conversa.appendChild(b);
            rolar();
            return b;
        }

        function botaoIr(destino) {
            const b = elemento("button", "nxf-ir", "Ir para " + destino.nome + " →");
            b.type = "button";
            b.addEventListener("click", () => { window.location.href = destino.url; });
            conversa.appendChild(b);
            rolar();
        }

        function digitando() {
            const d = elemento("div", "nxf-digitando");
            d.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
            conversa.appendChild(d);
            rolar();
            return d;
        }

        function boasVindas() {
            balao("Oi! Eu sou o Nexus 👋 Posso te explicar como usar o Plannexus, para que serve cada ferramenta e te levar até a página que você quiser. O que você quer saber?", "nexus");

            const caixa = elemento("div", "nxf-sugestoes");
            SUGESTOES.forEach((s) => {
                const b = elemento("button", "nxf-sugestao", s);
                b.type = "button";
                b.addEventListener("click", () => { caixa.remove(); perguntar(s); });
                caixa.appendChild(b);
            });
            conversa.appendChild(caixa);
        }

        async function perguntar(texto) {
            if (aguardando || !usuario) return;

            aguardando = true;
            enviar.disabled = true;

            balao(texto, "usuario");
            historico.push({ role: "user", text: texto });

            const indicador = digitando();

            try {
                const token = await usuario.getIdToken();

                const resposta = await fetch("/api/nexus", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({
                        modo: "ajuda",
                        mensagens: historico,
                        contexto: { pagina: pagina, temEvento: Boolean(eventoId) }
                    })
                });

                const dados = await resposta.json().catch(() => ({}));
                indicador.remove();

                if (!resposta.ok) {
                    historico.pop();
                    balao(dados.erro || "O Nexus não conseguiu responder agora.", "nexus", true);
                    return;
                }

                historico.push({ role: "model", text: dados.resposta });
                const balaoResposta = balao(dados.resposta, "nexus");
                anexarReporte(balaoResposta, {
                    usuario, pergunta: texto, resposta: dados.resposta,
                    origem: "chat de ajuda (página: " + pagina + ")"
                });

                const admin = Boolean(typeof EMAIL_ADMIN !== "undefined" && usuario.email &&
                    usuario.email.toLowerCase() === String(EMAIL_ADMIN).toLowerCase());
                const destino = resolverDestino(dados.destino, { eventoId, admin });

                if (destino) botaoIr(destino);
            }
            catch (erro) {
                console.error("Erro no Nexus (ajuda):", erro);
                indicador.remove();
                historico.pop();
                balao("Não consegui falar com o Nexus. Confira sua internet e tente de novo.", "nexus", true);
            }
            finally {
                aguardando = false;
                enviar.disabled = false;
                campo.focus();
            }
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const texto = campo.value.trim();
            if (!texto) return;
            campo.value = "";
            perguntar(texto);
        });

        // ---------- abrir / fechar (o "voltar" do celular fecha o painel) ----------

        let aberto = false;

        function abrir() {
            if (aberto) return;
            aberto = true;

            if (!conversa.childElementCount) boasVindas();

            fundo.hidden = false;
            botao.hidden = true;
            history.pushState({ nxf: true }, "");
            setTimeout(() => campo.focus(), 50);
        }

        function fecharPainel() {
            if (!aberto) return;
            aberto = false;
            fundo.hidden = true;
            botao.hidden = false;
        }

        function fecharPeloUsuario() {
            if (history.state && history.state.nxf) {
                history.back();      // o popstate fecha
            } else {
                fecharPainel();
            }
        }

        botao.addEventListener("click", abrir);
        fechar.addEventListener("click", fecharPeloUsuario);
        fundo.addEventListener("click", (e) => { if (e.target === fundo) fecharPeloUsuario(); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharPeloUsuario(); });
        window.addEventListener("popstate", fecharPainel);
    }

    onAuthStateChanged(auth, (u) => {
        usuario = u;
        if (u) montar();
    });
}
