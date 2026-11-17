import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

import { avisarColaboracao } from "./avisos.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const nomeEvento = document.getElementById("nomeEvento");
const voltarEl = document.getElementById("voltar");
const listaAnotacoes = document.getElementById("listaAnotacoes");
const mensagemVazia = document.getElementById("mensagemVazia");
const tituloMensagemVazia = mensagemVazia.querySelector("h3");
const textoMensagemVazia = mensagemVazia.querySelector("p");

const modalAnotacao = document.getElementById("modalAnotacao");
const formAnotacao = document.getElementById("formAnotacao");
const tituloModal = document.getElementById("tituloModal");
const tituloAnotacao = document.getElementById("tituloAnotacao");
const conteudoAnotacao = document.getElementById("conteudoAnotacao");
const botaoNovaAnotacao = document.getElementById("botaoNovaAnotacao");
const botaoFecharAnotacao = document.getElementById("botaoFecharAnotacao");
const botaoCancelar = document.getElementById("botaoCancelar");
const botaoSalvar = document.getElementById("botaoSalvar");

const pesquisa = document.getElementById("pesquisa");

const modalMensagem = document.getElementById("modalMensagem");
const tituloMensagem = document.getElementById("tituloMensagem");
const textoMensagem = document.getElementById("textoMensagem");
const botaoFecharMensagem = document.getElementById("botaoFecharMensagem");
const botaoCancelarMensagem = document.getElementById("botaoCancelarMensagem");
const botaoConfirmarMensagem = document.getElementById("botaoConfirmarMensagem");

const eventoId = pegarIdDaUrl();

let resolverConfirmacao = null;
let usuarioAtual = null;
let anotacoes = [];
let anotacaoEditando = null;
let souDono = false;
let souVisitante = false;

async function verificarAcesso() {
    if (!eventoId || eventoId.includes("/")) {
        window.location.replace("inicio.html");
        return false;
    }

    usuarioAtual = await exigirLogin(auth, onAuthStateChanged);

    if (!usuarioAtual) {
        window.location.replace("login.html");
        return false;
    }

    const referenciaEvento = doc(db, "eventos", eventoId);
    const documentoEvento = await getDoc(referenciaEvento);

    if (!documentoEvento.exists()) {
        window.location.replace("inicio.html");
        return false;
    }

    const dadosEvento = documentoEvento.data();

    souDono = dadosEvento.usuarioId === usuarioAtual.uid;

    if (!souDono) {
        const referenciaMembro = doc(
            db,
            "eventos",
            eventoId,
            "membros",
            usuarioAtual.uid
        );

        const documentoMembro = await getDoc(referenciaMembro);

        if (!documentoMembro.exists()) {
            window.location.replace("inicio.html");
            return false;
        }

        souVisitante = (documentoMembro.data().papel || "visitante") === "visitante";
    }

    nomeEvento.textContent = dadosEvento.nome || "Evento sem nome";

    voltarEl.href = `evento.html?id=${encodeURIComponent(eventoId)}`;

    botaoNovaAnotacao.hidden = souVisitante;

    return true;
}

function formatarData(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== "function") {
        return "";
    }

    return timestamp.toDate().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function criarBotao(texto, acao, id) {
    const botao = document.createElement("button");

    botao.type = "button";
    botao.textContent = texto;
    botao.dataset.acao = acao;
    botao.dataset.id = id;

    return botao;
}

function renderizarAnotacoes() {
    const termo = pesquisa.value.trim().toLowerCase();

    const anotacoesFiltradas = anotacoes.filter(anotacao => {
        const titulo = typeof anotacao.titulo === "string"
            ? anotacao.titulo
            : "";

        const conteudo = typeof anotacao.conteudo === "string"
            ? anotacao.conteudo
            : "";

        return (
            titulo.toLowerCase().includes(termo) ||
            conteudo.toLowerCase().includes(termo)
        );
    });

    listaAnotacoes.replaceChildren();

    mensagemVazia.hidden = anotacoesFiltradas.length > 0;

    if (anotacoesFiltradas.length === 0) {
        tituloMensagemVazia.textContent = termo
            ? "Nenhuma anotação encontrada"
            : "Nenhuma anotação encontrada";

        textoMensagemVazia.textContent = termo
            ? "Nenhuma anotação corresponde à sua pesquisa."
            : "Crie sua primeira anotação para organizar as informações do evento.";

        return;
    }

    anotacoesFiltradas.forEach(anotacao => {
        const cartao = document.createElement("article");
        const titulo = document.createElement("h3");
        const conteudo = document.createElement("p");
        const data = document.createElement("small");

        cartao.className = "cartaoAnotacao";

        titulo.textContent = anotacao.titulo || "";
        conteudo.textContent = anotacao.conteudo || "";

        data.textContent = anotacao.dataAtualizacao
            ? `Última atualização: ${formatarData(anotacao.dataAtualizacao)}`
            : "";

        cartao.append(titulo, conteudo, data);

        if (!souVisitante) {
            const botoes = document.createElement("div");
            botoes.className = "botoesAnotacao";

            const botaoEditar = criarBotao("Editar", "editar", anotacao.id);
            const botaoExcluir = criarBotao("Excluir", "excluir", anotacao.id);

            botoes.append(botaoEditar, botaoExcluir);
            cartao.appendChild(botoes);
        }

        cartao.appendChild(criarSecaoComentarios(anotacao));

        listaAnotacoes.appendChild(cartao);
    });
}

function abrirModalMensagem(titulo, mensagem, opcoes = {}) {
    return new Promise(resolve => {
        resolverConfirmacao = resolve;

        const confirmacao = opcoes.confirmacao === true;

        tituloMensagem.textContent = titulo;
        textoMensagem.textContent = mensagem;

        botaoCancelarMensagem.hidden = !confirmacao;

        botaoConfirmarMensagem.textContent = opcoes.textoConfirmar || "Entendi";

        modalMensagem.hidden = false;

        if (confirmacao) {
            botaoCancelarMensagem.focus();
        } else {
            botaoConfirmarMensagem.focus();
        }
    });
}

function fecharModalMensagem(resultado = false) {
    modalMensagem.hidden = true;

    if (resolverConfirmacao) {
        const resolver = resolverConfirmacao;
        resolverConfirmacao = null;
        resolver(resultado);
    }
}

async function mostrarMensagem(titulo, mensagem) {
    await abrirModalMensagem(titulo, mensagem);
}

async function confirmarAcao(titulo, mensagem) {
    return abrirModalMensagem(titulo, mensagem, {
        confirmacao: true,
        textoConfirmar: "Excluir"
    });
}

botaoConfirmarMensagem.addEventListener("click", () => {
    fecharModalMensagem(true);
});

botaoCancelarMensagem.addEventListener("click", () => {
    fecharModalMensagem(false);
});

botaoFecharMensagem.addEventListener("click", () => {
    fecharModalMensagem(false);
});

document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && !modalMensagem.hidden) {
        fecharModalMensagem(false);
    }

    if (evento.key === "Escape" && !modalAnotacao.hidden) {
        fecharModal();
    }
});

function criarSecaoComentarios(anotacao) {
    const secao = document.createElement("div");
    secao.className = "secaoComentarios";

    const titulo = document.createElement("h4");
    titulo.textContent = "Comentários do organizador";

    secao.appendChild(titulo);

    const lista = document.createElement("div");
    lista.className = "listaComentarios";

    const comentarios = Array.isArray(anotacao.comentarios)
        ? anotacao.comentarios
        : [];

    if (comentarios.length === 0) {
        const vazio = document.createElement("p");
        vazio.className = "comentarioVazio";
        vazio.textContent = "Nenhum comentário ainda.";

        lista.appendChild(vazio);
    } else {
        comentarios.forEach(comentario => {
            const item = document.createElement("div");
            item.className = "comentarioItem";

            const texto = document.createElement("p");
            texto.textContent = comentario.texto || "";

            const dataComentario = document.createElement("small");
            dataComentario.textContent = comentario.dataCriacao
                ? formatarData(comentario.dataCriacao)
                : "";

            item.append(texto, dataComentario);

            if (souDono) {
                const botaoExcluirComentario = criarBotao(
                    "Excluir comentário",
                    "excluir-comentario",
                    comentario.id
                );

                botaoExcluirComentario.dataset.anotacaoId = anotacao.id;

                item.appendChild(botaoExcluirComentario);
            }

            lista.appendChild(item);
        });
    }

    secao.appendChild(lista);

    if (souDono) {
        const form = document.createElement("form");
        form.className = "formComentario";
        form.dataset.anotacaoId = anotacao.id;

        const campo = document.createElement("textarea");
        campo.placeholder = "Escreva um comentário sobre esta anotação...";
        campo.maxLength = 1000;
        campo.required = true;

        const botaoEnviar = document.createElement("button");
        botaoEnviar.type = "submit";
        botaoEnviar.textContent = "Comentar";

        form.append(campo, botaoEnviar);

        secao.appendChild(form);

        form.addEventListener("submit", async evento => {
            evento.preventDefault();
            await comentar(anotacao.id, campo.value.trim());
        });
    }

    return secao;
}

async function carregarAnotacoes() {
    const referenciaAnotacoes = collection(
        db,
        "eventos",
        eventoId,
        "anotacoes"
    );

    const resultado = await getDocs(referenciaAnotacoes);

    anotacoes = await Promise.all(resultado.docs.map(async documento => {
        const referenciaComentarios = collection(
            db,
            "eventos",
            eventoId,
            "anotacoes",
            documento.id,
            "comentarios"
        );

        const resultadoComentarios = await getDocs(referenciaComentarios);

        const comentarios = resultadoComentarios.docs.map(comentario => ({
            id: comentario.id,
            ...comentario.data()
        })).sort((a, b) => {
            return (a.dataCriacao?.toMillis() || 0) -
                (b.dataCriacao?.toMillis() || 0);
        });

        return {
            id: documento.id,
            ...documento.data(),
            comentarios
        };
    }));

    anotacoes.sort((a, b) => {
        const dataA = a.dataAtualizacao?.toMillis() || 0;
        const dataB = b.dataAtualizacao?.toMillis() || 0;

        return dataB - dataA;
    });

    renderizarAnotacoes();
}

async function comentar(anotacaoId, texto) {
    if (!souDono || !texto) {
        return;
    }

    try {
        await addDoc(
            collection(
                db,
                "eventos",
                eventoId,
                "anotacoes",
                anotacaoId,
                "comentarios"
            ),
            {
                texto,
                autorUid: usuarioAtual.uid,
                dataCriacao: serverTimestamp()
            }
        );

        const anotacaoComentada = anotacoes.find(
            anotacao => anotacao.id === anotacaoId
        );

        avisarColaboracao(
            db,
            auth.currentUser,
            eventoId,
            "notas",
            "comentou",
            anotacaoComentada &&
            typeof anotacaoComentada.titulo === "string"
                ? anotacaoComentada.titulo
                : ""
        );

        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao comentar:", erro);

        await mostrarMensagem(
            "Erro ao comentar",
            "Não foi possível salvar o comentário. Tente novamente."
        );
    }
}

async function excluirComentario(anotacaoId, comentarioId) {
    if (!souDono) {
        return;
    }

    const confirmou = await confirmarAcao(
        "Excluir comentário",
        "Tem certeza de que deseja excluir este comentário? Essa ação não poderá ser desfeita."
    );

    if (!confirmou) {
        return;
    }

    try {
        await deleteDoc(
            doc(
                db,
                "eventos",
                eventoId,
                "anotacoes",
                anotacaoId,
                "comentarios",
                comentarioId
            )
        );

        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao excluir comentário:", erro);

        await mostrarMensagem(
            "Erro ao excluir",
            "Não foi possível excluir o comentário. Tente novamente."
        );
    }
}

function abrirModal(anotacao = null) {
    if (souVisitante) {
        return;
    }

    formAnotacao.reset();

    anotacaoEditando = anotacao ? anotacao.id : null;

    if (anotacao) {
        tituloModal.textContent = "Editar anotação";
        tituloAnotacao.value = anotacao.titulo || "";
        conteudoAnotacao.value = anotacao.conteudo || "";
    } else {
        tituloModal.textContent = "Nova anotação";
    }

    modalAnotacao.hidden = false;
    tituloAnotacao.focus();
}

function fecharModal() {
    modalAnotacao.hidden = true;
    formAnotacao.reset();
    anotacaoEditando = null;
}

async function salvarAnotacao(evento) {
    evento.preventDefault();

    if (souVisitante) {
        return;
    }

    const titulo = tituloAnotacao.value.trim();
    const conteudo = conteudoAnotacao.value.trim();

    if (!titulo || !conteudo) {
        await mostrarMensagem(
            "Campos obrigatórios",
            "Preencha o título e o conteúdo da anotação."
        );

        return;
    }

    if (titulo.length > 100 || conteudo.length > 10000) {
        await mostrarMensagem(
            "Limite de caracteres",
            "A anotação ultrapassou o limite permitido de caracteres."
        );

        return;
    }

    botaoSalvar.disabled = true;

    try {
        const referenciaAnotacoes = collection(
            db,
            "eventos",
            eventoId,
            "anotacoes"
        );

        if (anotacaoEditando) {
            const referenciaAnotacao = doc(
                referenciaAnotacoes,
                anotacaoEditando
            );

            await updateDoc(referenciaAnotacao, {
                titulo,
                conteudo,
                dataAtualizacao: serverTimestamp()
            });

        } else {
            await addDoc(referenciaAnotacoes, {
                titulo,
                conteudo,
                dataCriacao: serverTimestamp(),
                dataAtualizacao: serverTimestamp()
            });

            avisarColaboracao(
                db,
                auth.currentUser,
                eventoId,
                "notas",
                "adicionou",
                titulo
            );
        }

        fecharModal();
        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao salvar anotação:", erro);

        await mostrarMensagem(
            "Erro ao salvar",
            "Não foi possível salvar a anotação. Tente novamente."
        );

    } finally {
        botaoSalvar.disabled = false;
    }
}

async function excluirAnotacao(id) {
    if (souVisitante) {
        return;
    }

    const confirmou = await confirmarAcao(
        "Excluir anotação",
        "Tem certeza de que deseja excluir esta anotação? Essa ação não poderá ser desfeita."
    );

    if (!confirmou) {
        return;
    }

    try {
        await deleteDoc(
            doc(db, "eventos", eventoId, "anotacoes", id)
        );

        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao excluir anotação:", erro);

        await mostrarMensagem(
            "Erro ao excluir",
            "Não foi possível excluir a anotação. Tente novamente."
        );
    }
}

botaoNovaAnotacao.addEventListener("click", () => {
    abrirModal();
});

botaoCancelar.addEventListener("click", fecharModal);

botaoFecharAnotacao.addEventListener("click", fecharModal);

formAnotacao.addEventListener("submit", salvarAnotacao);

pesquisa.addEventListener("input", renderizarAnotacoes);

listaAnotacoes.addEventListener("click", async evento => {
    if (!(evento.target instanceof Element)) {
        return;
    }

    const botao = evento.target.closest("button[data-acao]");

    if (!botao) {
        return;
    }

    const id = botao.dataset.id;
    const acao = botao.dataset.acao;

    if (acao === "editar") {
        const anotacao = anotacoes.find(item => item.id === id);

        if (anotacao) {
            abrirModal(anotacao);
        }
    }

    if (acao === "excluir") {
        await excluirAnotacao(id);
    }

    if (acao === "excluir-comentario") {
        const anotacaoId = botao.dataset.anotacaoId;

        await excluirComentario(anotacaoId, id);
    }
});

async function iniciarBlocoNotas() {
    try {
        const acessoPermitido = await verificarAcesso();

        if (!acessoPermitido) {
            return;
        }

        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao iniciar o bloco de notas:", erro);

        await mostrarMensagem(
            "Erro ao carregar",
            "Não foi possível carregar o bloco de notas. Verifique sua conexão e tente novamente."
        );
    }
}

iniciarBlocoNotas();