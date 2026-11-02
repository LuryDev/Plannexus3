import {initializeApp} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";

import {getAuth, onAuthStateChanged} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const firestore = getFirestore(app);

const nomeEvento = document.getElementById("nomeEvento");
const lista = document.getElementById("listaCompromissos");
const botaoNovo = document.getElementById("botaoNovo");
const modal = document.getElementById("modal");
const formulario = document.getElementById("formCompromisso");
const botaoFechar = document.getElementById("fecharModal");
const botaoSalvar = document.getElementById("botaoSalvar");
const mensagem = document.getElementById("mensagem");
const tituloInput = document.getElementById("tituloCompromisso");
const dataInput = document.getElementById("dataCompromisso");
const horarioInput = document.getElementById("horarioCompromisso");
const descricaoInput = document.getElementById("descricaoCompromisso");

const eventoId = pegarIdDaUrl();

let usuarioAtual = null;

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = tipo;
}

function abrirModal() {
    formulario.reset();
    dataInput.value = hojeISO();
    mensagem.textContent = "";
    modal.style.display = "flex";
    tituloInput.focus();
}

function fecharModal() {
    modal.style.display = "none";
    formulario.reset();
}

async function carregarEvento() {
    if (!eventoId) {
        nomeEvento.textContent = "Evento não informado";
        botaoNovo.disabled = true;
        mostrarMensagem("O endereço não contém o ID do evento.");
        return false;
    }

    const referencia = doc(firestore, "eventos", eventoId);
    const resultado = await getDoc(referencia);

    if (!resultado.exists()) {
        nomeEvento.textContent = "Evento não encontrado";
        botaoNovo.disabled = true;
        mostrarMensagem("Não foi possível localizar este evento.");
        return false;
    }

    const evento = resultado.data();
    nomeEvento.textContent = evento.nome || "Evento sem nome";

    return true;
}

async function carregarCompromissos() {
    lista.replaceChildren();

    try {
        const referencia = collection(
            firestore,
            "eventos",
            eventoId,
            "calendario"
        );

        const resultado = await getDocs(referencia);

        const compromissos = resultado.docs.map(documento => ({
            id: documento.id,
            ...documento.data()
        }));

        compromissos.sort((a, b) => {
            const dataA = dataParaOrdenar(a.data);
            const dataB = dataParaOrdenar(b.data);

            if (dataA !== dataB) {
                return dataA.localeCompare(dataB);
            }

            return String(a.horario || "")
                .localeCompare(String(b.horario || ""));
        });

        if (compromissos.length === 0) {
            const vazio = document.createElement("p");
            vazio.textContent = "Nenhum compromisso cadastrado.";
            lista.appendChild(vazio);
            return;
        }

        for (const item of compromissos) {
            lista.appendChild(criarCartao(item));
        }

    } catch (erro) {
        console.error("Erro ao carregar compromissos:", erro);
        mostrarMensagem(
            "Não foi possível carregar os compromissos."
        );
    }
}

function criarCartao(item) {
    const cartao = document.createElement("article");
    cartao.className = "compromisso";

    const titulo = document.createElement("h3");
    titulo.textContent = item.titulo || "Sem título";

    const data = document.createElement("p");
    data.textContent = `Data: ${formatarData(item.data)}`;

    const horario = document.createElement("p");
    horario.textContent = `Horário: ${item.horario || "Não informado"}`;

    const descricao = document.createElement("p");
    descricao.textContent = item.descricao || "Sem descrição";

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.addEventListener("click", () => excluirCompromisso(item.id));

    cartao.append(
        titulo,
        data,
        horario,
        descricao,
        botaoExcluir
    );

    return cartao;
}

formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!usuarioAtual || !eventoId) {
        mostrarMensagem("Sua sessão ou o evento não está disponível.");
        return;
    }

    const titulo = tituloInput.value.trim();
    const data = dataInput.value;
    const horario = horarioInput.value;
    const descricao = descricaoInput.value.trim();

    if (!titulo || !data || !horario) {
        mostrarMensagem("Preencha o título, a data e o horário.");
        return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";

    try {
        const referencia = collection(
            firestore,
            "eventos",
            eventoId,
            "calendario"
        );

        await addDoc(referencia, {
            titulo,
            data,
            horario,
            descricao,
            criadoEm: serverTimestamp()
        });

        fecharModal();
        mostrarMensagem("Compromisso cadastrado com sucesso.", "sucesso");

        await carregarCompromissos();

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);
        mostrarMensagem(
            "Não foi possível salvar. Verifique sua permissão e tente novamente."
        );

    } finally {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar compromisso";
    }
});

async function excluirCompromisso(itemId) {
    if (!usuarioAtual || !eventoId) {
        mostrarMensagem("Você precisa estar autenticado.");
        return;
    }

    if (!confirm("Deseja realmente excluir este compromisso?")) {
        return;
    }

    try {
        const referencia = doc(
            firestore,
            "eventos",
            eventoId,
            "calendario",
            itemId
        );

        await deleteDoc(referencia);

        mostrarMensagem("Compromisso excluído.", "sucesso");
        await carregarCompromissos();

    } catch (erro) {
        console.error("Erro ao excluir compromisso:", erro);
        mostrarMensagem(
            "Não foi possível excluir o compromisso."
        );
    }
}

botaoNovo.addEventListener("click", abrirModal);
botaoFechar.addEventListener("click", fecharModal);

async function iniciar() {
    botaoNovo.disabled = true;

    try {
        usuarioAtual = await exigirLogin(auth, onAuthStateChanged);

        if (!usuarioAtual) {
            return;
        }

        const eventoCarregado = await carregarEvento();

        if (!eventoCarregado) {
            return;
        }

        await carregarCompromissos();
        botaoNovo.disabled = false;

    } catch (erro) {
        console.error("Erro ao iniciar calendário:", erro);
        nomeEvento.textContent = "Erro ao carregar o calendário";
        mostrarMensagem(
            "Não foi possível abrir o calendário. Verifique sua conexão e suas permissões."
        );
    }
}

iniciar();
