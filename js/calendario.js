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
    serverTimestamp,
    updateDoc
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
const modalConfirmacao = document.getElementById("modalConfirmacao");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");
const localInput = document.getElementById("localCompromisso");
const responsaveisInput = document.getElementById("responsaveisCompromisso");
const tituloModal = document.getElementById("tituloModal");

const eventoId = pegarIdDaUrl();

let compromissoEditando = null;
let compromissoParaExcluir = null;
let usuarioAtual = null;
let eventoAtual = null;

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.dataset.tipo = tipo;
}

function abrirModal() {
    compromissoEditando = null;

    formulario.reset();
    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";

    dataInput.value = hojeISO();
    mensagem.textContent = "";

    modal.style.display = "flex";
    tituloInput.focus();
}

function fecharModal() {
    modal.style.display = "none";
    formulario.reset();
    compromissoEditando = null;

    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";
}

function abrirModalConfirmacao(itemId) {
    compromissoParaExcluir = itemId;
    modalConfirmacao.style.display = "flex";
}

function fecharModalConfirmacao() {
    modalConfirmacao.style.display = "none";
    compromissoParaExcluir = null;
}

function editarCompromisso(item) {

    compromissoEditando = item.id;

    tituloInput.value = item.titulo || "";
    dataInput.value = item.data || "";
    horarioInput.value = item.horario || "";
    localInput.value = item.local || "";
    responsaveisInput.value = item.responsaveis || "";
    descricaoInput.value = item.descricao || "";

    tituloModal.textContent = "Editar compromisso";
    botaoSalvar.textContent = "Salvar alterações";

    mensagem.textContent = "";
    modal.style.display = "flex";

    tituloInput.focus();
}

function atualizarAvisoEvento() {
    const aviso = document.getElementById("avisoEvento");

    if (!eventoAtual || !eventoAtual.data) {
        aviso.textContent = "Data do evento não informada.";
        return;
    }

    const [ano, mes, dia] = eventoAtual.data.split("-").map(Number);

    const dataEvento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const diferenca = Math.round(
        (dataEvento - hoje) / (1000 * 60 * 60 * 24)
    );

    aviso.className = "aviso-evento";

    if (diferenca < 0) {
        aviso.textContent = "Este evento já passou.";
        aviso.classList.add("encerrado");

    } else if (diferenca === 0) {
        aviso.textContent = "Hoje é o grande dia! O evento acontece hoje.";
        aviso.classList.add("hoje");

    } else if (diferenca <= 7) {
        aviso.textContent = `Faltam apenas ${diferenca} dias para o evento!`;
        aviso.classList.add("proximo");

    } else {
        aviso.textContent = `Faltam ${diferenca} dias para o evento.`;
        aviso.classList.add("futuro");
    }
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

       eventoAtual = resultado.data();
    nomeEvento.textContent = eventoAtual.nome || "Evento sem nome";
    atualizarAvisoEvento();

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
            ...documento.data(),
            id: documento.id
        }));

        if (eventoAtual.data) {
            compromissos.push({
            id: "dia-do-evento",
            titulo: "Dia do evento",
            data: eventoAtual.data,
            horario: eventoAtual.horario || "",
            descricao: "Data principal do evento.",
            automatico: true
        });
    }

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

    const local = document.createElement("p");
    local.textContent = `Local: ${item.local || "Não informado"}`;

    const responsaveis = document.createElement("p");
    responsaveis.textContent = `Responsáveis: ${item.responsaveis || "Não informados"}`;

    const descricao = document.createElement("p");
    descricao.textContent = item.descricao || "Sem descrição";

    cartao.append(
        titulo,
        data,
        horario,
        local,
        responsaveis,
        descricao
    );

    if (!item.automatico) {

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.textContent = "Editar";
        botaoEditar.addEventListener("click", () => editarCompromisso(item));

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.addEventListener("click", () => {
            abrirModalConfirmacao(item.id);
        });

        cartao.append(botaoEditar, botaoExcluir);
    }

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
    const local = localInput.value.trim();
    const responsaveis = responsaveisInput.value.trim();
    const descricao = descricaoInput.value.trim();

    if (!titulo || !data || !horario) {
        mostrarMensagem("Preencha o título, a data e o horário.");
        return;
    }

    botaoSalvar.disabled = true;

    try {
        const dadosCompromisso = {
            titulo,
            data,
            horario,
            local,
            responsaveis,
            descricao
        };

    if (compromissoEditando) {

        const referencia = doc(
            firestore,
            "eventos",
            eventoId,
            "calendario",
            compromissoEditando
        );

        await updateDoc(referencia, dadosCompromisso);

        mostrarMensagem("Compromisso atualizado com sucesso.", "sucesso");

    } else {

            const referencia = collection(
                firestore,
                "eventos",
                eventoId,
                "calendario"
            );

            await addDoc(referencia, {
                ...dadosCompromisso,
                criadoEm: serverTimestamp()
            });

            mostrarMensagem("Compromisso cadastrado com sucesso.", "sucesso");
        }

    fecharModal();
    await carregarCompromissos();

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);
        mostrarMensagem("Não foi possível salvar as alterações.");

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
cancelarExclusao.addEventListener("click", fecharModalConfirmacao);

confirmarExclusao.addEventListener("click", async () => {
    if (!compromissoParaExcluir) return;

    const itemId = compromissoParaExcluir;

    confirmarExclusao.disabled = true;

    try {
        await excluirCompromisso(itemId);
        fecharModalConfirmacao();
    } finally {
        confirmarExclusao.disabled = false;
    }
});


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
