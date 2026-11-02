
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

const app = initializeApp(window.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

const nomeEvento = document.getElementById("nomeEvento");
const listaAnotacoes = document.getElementById("listaAnotacoes");
const mensagemVazia = document.getElementById("mensagemVazia");
const modalAnotacao = document.getElementById("modalAnotacao");
const formAnotacao = document.getElementById("formAnotacao");
const tituloModal = document.getElementById("tituloModal");
const tituloAnotacao = document.getElementById("tituloAnotacao");
const conteudoAnotacao = document.getElementById("conteudoAnotacao");
const botaoNovaAnotacao = document.getElementById("botaoNovaAnotacao");
const botaoCancelar = document.getElementById("botaoCancelar");
const botaoSalvar = document.getElementById("botaoSalvar");
const pesquisa = document.getElementById("pesquisa");

const eventoId = pegarIdDaUrl();

let usuarioAtual = null;
let anotacoes = [];
let anotacaoEditando = null;

function obterUsuario() {
    return new Promise((resolve, reject) => {
        let cancelar = () => {};

        cancelar = onAuthStateChanged(
            auth,
            usuario => {
                cancelar();
                resolve(usuario);
            },
            erro => {
                cancelar();
                reject(erro);
            }
        );
    });
}

async function verificarAcesso() {
    if (!eventoId) {
        alert("Nenhum evento foi informado.");
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
        alert("Evento não encontrado.");
        window.location.replace("inicio.html");
        return false;
    }

    const dadosEvento = documentoEvento.data();

    if (dadosEvento.usuarioId !== usuarioAtual.uid) {
        alert("Você não tem autorização para acessar este evento.");
        window.location.replace("inicio.html");
        return false;
    }

    nomeEvento.textContent = dadosEvento.nome;

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
        return (
            anotacao.titulo.toLowerCase().includes(termo) ||
            anotacao.conteudo.toLowerCase().includes(termo)
        );
    });

    listaAnotacoes.replaceChildren();

    mensagemVazia.hidden = anotacoesFiltradas.length > 0;

    if (anotacoesFiltradas.length === 0) {
        mensagemVazia.textContent = termo
            ? "Nenhuma anotação corresponde à pesquisa."
            : "Nenhuma anotação encontrada.";

        listaAnotacoes.appendChild(mensagemVazia);
        return;
    }

    anotacoesFiltradas.forEach(anotacao => {
        const cartao = document.createElement("article");
        const titulo = document.createElement("h3");
        const conteudo = document.createElement("p");
        const data = document.createElement("small");
        const botoes = document.createElement("div");

        cartao.className = "cartaoAnotacao";
        botoes.className = "botoesAnotacao";

        titulo.textContent = anotacao.titulo;
        conteudo.textContent = anotacao.conteudo;

        data.textContent = anotacao.dataAtualizacao
            ? `Última atualização: ${formatarData(anotacao.dataAtualizacao)}`
            : "";

        const botaoEditar = criarBotao(
            "Editar",
            "editar",
            anotacao.id
        );

        const botaoExcluir = criarBotao(
            "Excluir",
            "excluir",
            anotacao.id
        );

        botoes.append(botaoEditar, botaoExcluir);
        cartao.append(titulo, conteudo, data, botoes);

        listaAnotacoes.appendChild(cartao);
    });
}

async function carregarAnotacoes() {
    const referenciaAnotacoes = collection(
        db,
        "eventos",
        eventoId,
        "anotacoes"
    );

    const resultado = await getDocs(referenciaAnotacoes);

    anotacoes = resultado.docs.map(documento => ({
        id: documento.id,
        ...documento.data()
    }));

    anotacoes.sort((a, b) => {
        const dataA = a.dataAtualizacao?.toMillis() || 0;
        const dataB = b.dataAtualizacao?.toMillis() || 0;

        return dataB - dataA;
    });

    renderizarAnotacoes();
}

function abrirModal(anotacao = null) {
    formAnotacao.reset();

    anotacaoEditando = anotacao ? anotacao.id : null;

    if (anotacao) {
        tituloModal.textContent = "Editar anotação";
        tituloAnotacao.value = anotacao.titulo;
        conteudoAnotacao.value = anotacao.conteudo;
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

    const titulo = tituloAnotacao.value.trim();
    const conteudo = conteudoAnotacao.value.trim();

    if (!titulo || !conteudo) {
        alert("Preencha o título e o conteúdo da anotação.");
        return;
    }

    if (titulo.length > 100 || conteudo.length > 10000) {
        alert("A anotação ultrapassou o limite permitido de caracteres.");
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
        }

        fecharModal();
        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao salvar anotação:", erro);
        alert("Não foi possível salvar a anotação. Tente novamente.");
    } finally {
        botaoSalvar.disabled = false;
    }
}

async function excluirAnotacao(id) {
    const confirmar = confirm(
        "Tem certeza de que deseja excluir esta anotação?"
    );

    if (!confirmar) {
        return;
    }

    try {
        const referenciaAnotacao = doc(
            db,
            "eventos",
            eventoId,
            "anotacoes",
            id
        );

        await deleteDoc(referenciaAnotacao);

        await carregarAnotacoes();

    } catch (erro) {
        console.error("Erro ao excluir anotação:", erro);
        alert("Não foi possível excluir a anotação.");
    }
}

botaoNovaAnotacao.addEventListener("click", () => {
    abrirModal();
});

botaoCancelar.addEventListener("click", fecharModal);

formAnotacao.addEventListener("submit", salvarAnotacao);

pesquisa.addEventListener("input", renderizarAnotacoes);

listaAnotacoes.addEventListener("click", async evento => {
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
        alert("Não foi possível carregar o bloco de notas.");
    }
}

iniciarBlocoNotas();
