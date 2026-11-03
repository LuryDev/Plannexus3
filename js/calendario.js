<<<<<<< HEAD
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
const mensagemFormulario = document.getElementById("mensagemFormulario");
const tituloInput = document.getElementById("tituloCompromisso");
const dataInput = document.getElementById("dataCompromisso");
const horarioInput = document.getElementById("horarioCompromisso");
const localInput = document.getElementById("localCompromisso");
const responsaveisInput = document.getElementById("responsaveisCompromisso");
const descricaoInput = document.getElementById("descricaoCompromisso");
const tituloModal = document.getElementById("tituloModal");
const avisoEvento = document.getElementById("avisoEvento");
const modalConfirmacao = document.getElementById("modalConfirmacao");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");

const eventoId = pegarIdDaUrl();

let usuarioAtual = null;
let eventoAtual = null;
let compromissoEditando = null;
let compromissoParaExcluir = null;

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.className = tipo === "sucesso"
        ? "aviso sucesso"
        : "aviso erro";
}

function abrirModal() {
    compromissoEditando = null;

    formulario.reset();

    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";

    mensagemFormulario.textContent = "";
    dataInput.value = hojeISO();

    modal.style.display = "flex";
    tituloInput.focus();
}

function fecharModal() {
    modal.style.display = "none";

    formulario.reset();

    compromissoEditando = null;

    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";

    mensagemFormulario.textContent = "";
}

function abrirModalConfirmacao(itemId) {
    compromissoParaExcluir = itemId;

    modalConfirmacao.style.display = "flex";

    cancelarExclusao.focus();
}

function fecharModalConfirmacao() {
    modalConfirmacao.style.display = "none";

    compromissoParaExcluir = null;
}

function dataValida(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }

    const [ano, mes, dia] = data.split("-").map(Number);
    const dataTeste = new Date(ano, mes - 1, dia);

    return (
        dataTeste.getFullYear() === ano &&
        dataTeste.getMonth() === mes - 1 &&
        dataTeste.getDate() === dia
    );
}

function atualizarAvisoEvento() {
    if (!eventoAtual || !dataValida(eventoAtual.data || "")) {
        avisoEvento.textContent = "Data do evento não informada.";
        return;
    }

    const [ano, mes, dia] = eventoAtual.data.split("-").map(Number);

    const dataEvento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const diferenca = Math.round(
        (dataEvento - hoje) / (1000 * 60 * 60 * 24)
    );

    avisoEvento.className = "aviso";

    if (diferenca < 0) {
        avisoEvento.textContent = "Este evento já passou.";
        avisoEvento.classList.add("encerrado");

    } else if (diferenca === 0) {
        avisoEvento.textContent = "Hoje é o grande dia! O evento acontece hoje.";
        avisoEvento.classList.add("hoje");

    } else if (diferenca <= 7) {
        avisoEvento.textContent = `Faltam apenas ${diferenca} dias para o evento!`;
        avisoEvento.classList.add("proximo");

    } else {
        avisoEvento.textContent = `Faltam ${diferenca} dias para o evento.`;
        avisoEvento.classList.add("futuro");
    }
}

async function carregarEvento() {
    if (!eventoId || eventoId.includes("/")) {
        nomeEvento.textContent = "Evento não informado";
        botaoNovo.disabled = true;

        mostrarMensagem("O endereço não contém um ID de evento válido.");

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
            id: documento.id,
            automatico: false
        }));

        if (eventoAtual && dataValida(eventoAtual.data || "")) {
            compromissos.push({
                id: "dia-do-evento",
                titulo: "Dia do evento",
                data: eventoAtual.data,
                horario: eventoAtual.horario || "",
                local: eventoAtual.local || "",
                responsaveis: "",
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

            return String(a.horario || "").localeCompare(
                String(b.horario || "")
            );
        });

        if (compromissos.length === 0) {
            const vazio = document.createElement("p");
            vazio.className = "aviso";
            vazio.textContent = "Nenhum compromisso cadastrado.";

            lista.appendChild(vazio);

            return true;
        }

        for (const item of compromissos) {
            lista.appendChild(criarCartao(item));
        }

        return true;

    } catch (erro) {
        console.error("Erro ao carregar compromissos:", erro);

        mostrarMensagem("Não foi possível carregar os compromissos.");

        return false;
    }
}

function criarCartao(item) {
    const cartao = document.createElement("article");
    cartao.className = "card-compromisso";

    if (item.automatico) {
        cartao.classList.add("dia-evento");
    }

    const dataHora = document.createElement("div");
    dataHora.className = "data-hora";

    const data = document.createElement("span");
    data.textContent = `Data: ${formatarData(item.data)}`;

    const horario = document.createElement("span");
    horario.textContent = `Horário: ${item.horario || "Não informado"}`;

    dataHora.append(data, horario);

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes";

    const titulo = document.createElement("h3");
    titulo.textContent = item.titulo || "Sem título";

    const local = document.createElement("p");
    local.textContent = `Local: ${item.local || "Não informado"}`;

    const responsaveis = document.createElement("p");
    responsaveis.textContent = `Responsáveis: ${item.responsaveis || "Não informados"}`;

    const descricao = document.createElement("p");
    descricao.textContent = item.descricao || "Sem descrição";

    detalhes.append(
        titulo,
        local,
        responsaveis,
        descricao
    );

    cartao.append(dataHora, detalhes);

    if (!item.automatico) {
        const acoes = document.createElement("div");
        acoes.className = "acoes-compromisso";

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "editar";
        botaoEditar.textContent = "Editar";

        botaoEditar.addEventListener("click", () => {
            editarCompromisso(item);
        });

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.className = "excluir";
        botaoExcluir.textContent = "Excluir";

        botaoExcluir.addEventListener("click", () => {
            abrirModalConfirmacao(item.id);
        });

        acoes.append(botaoEditar, botaoExcluir);

        cartao.appendChild(acoes);
    }

    return cartao;
}

function editarCompromisso(item) {
    if (!item || item.automatico) {
        return;
    }

    compromissoEditando = item.id;

    tituloInput.value = item.titulo || "";
    dataInput.value = item.data || "";
    horarioInput.value = item.horario || "";
    localInput.value = item.local || "";
    responsaveisInput.value = item.responsaveis || "";
    descricaoInput.value = item.descricao || "";

    tituloModal.textContent = "Editar compromisso";
    botaoSalvar.textContent = "Salvar alterações";

    mensagemFormulario.textContent = "";

    modal.style.display = "flex";

    tituloInput.focus();
}


formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!usuarioAtual || !eventoId) {
        mensagemFormulario.textContent = "Sua sessão ou o evento não está disponível.";
        return;
    }

    const titulo = tituloInput.value.trim();
    const data = dataInput.value;
    const horario = horarioInput.value;
    const local = localInput.value.trim();
    const responsaveis = responsaveisInput.value.trim();
    const descricao = descricaoInput.value.trim();

    if (!titulo || !data || !horario) {
        mensagemFormulario.textContent = "Preencha o título, a data e o horário.";
        return;
    }

    if (!dataValida(data)) {
        mensagemFormulario.textContent = "Informe uma data válida.";
        return;
    }

    if (
        titulo.length > 120 ||
        local.length > 150 ||
        responsaveis.length > 300 ||
        descricao.length > 2000
    ) {
        mensagemFormulario.textContent = "Um ou mais campos ultrapassaram o limite permitido.";
        return;
    }

    const dadosCompromisso = {
        titulo,
        data,
        horario,
        local,
        responsaveis,
        descricao
    };

    botaoSalvar.disabled = true;

    try {
        if (compromissoEditando) {
            const referencia = doc(
                firestore,
                "eventos",
                eventoId,
                "calendario",
                compromissoEditando
            );

            await updateDoc(referencia, dadosCompromisso);

            fecharModal();

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

            fecharModal();

            mostrarMensagem("Compromisso cadastrado com sucesso.", "sucesso");
        }

        await carregarCompromissos();

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);

        mensagemFormulario.textContent =
            "Não foi possível salvar. Verifique sua conexão e suas permissões.";

    } finally {
        botaoSalvar.disabled = false;

        if (compromissoEditando) {
            botaoSalvar.textContent = "Salvar alterações";
        } else {
            botaoSalvar.textContent = "Salvar compromisso";
        }
    }
});

async function excluirCompromisso(itemId) {
    if (!usuarioAtual || !eventoId || !itemId || itemId === "dia-do-evento") {
        mostrarMensagem("Não foi possível excluir este compromisso.");
        return false;
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

        mostrarMensagem("Compromisso excluído com sucesso.", "sucesso");

        await carregarCompromissos();

        return true;

    } catch (erro) {
        console.error("Erro ao excluir compromisso:", erro);

        mostrarMensagem("Não foi possível excluir o compromisso.");

        return false;
    }
}

botaoNovo.addEventListener("click", abrirModal);

botaoFechar.addEventListener("click", fecharModal);

cancelarExclusao.addEventListener("click", fecharModalConfirmacao);

confirmarExclusao.addEventListener("click", async () => {
    if (!compromissoParaExcluir) {
        return;
    }

    const itemId = compromissoParaExcluir;

    confirmarExclusao.disabled = true;

    const excluido = await excluirCompromisso(itemId);

    confirmarExclusao.disabled = false;

    if (excluido) {
        fecharModalConfirmacao();
    }
});

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        fecharModal();
    }
});

modalConfirmacao.addEventListener("click", (event) => {
    if (event.target === modalConfirmacao) {
        fecharModalConfirmacao();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (modalConfirmacao.style.display === "flex") {
            fecharModalConfirmacao();
        } else if (modal.style.display === "flex") {
            fecharModal();
        }
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
=======
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
const mensagemFormulario = document.getElementById("mensagemFormulario");
const tituloInput = document.getElementById("tituloCompromisso");
const dataInput = document.getElementById("dataCompromisso");
const horarioInput = document.getElementById("horarioCompromisso");
const localInput = document.getElementById("localCompromisso");
const responsaveisInput = document.getElementById("responsaveisCompromisso");
const descricaoInput = document.getElementById("descricaoCompromisso");
const tituloModal = document.getElementById("tituloModal");
const avisoEvento = document.getElementById("avisoEvento");
const modalConfirmacao = document.getElementById("modalConfirmacao");
const cancelarExclusao = document.getElementById("cancelarExclusao");
const confirmarExclusao = document.getElementById("confirmarExclusao");

const eventoId = pegarIdDaUrl();

let usuarioAtual = null;
let eventoAtual = null;
let compromissoEditando = null;
let compromissoParaExcluir = null;

function mostrarMensagem(texto, tipo = "erro") {
    mensagem.textContent = texto;
    mensagem.className = tipo === "sucesso"
        ? "aviso sucesso"
        : "aviso erro";
}

function abrirModal() {
    compromissoEditando = null;

    formulario.reset();

    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";

    mensagemFormulario.textContent = "";
    dataInput.value = hojeISO();

    modal.style.display = "flex";
    tituloInput.focus();
}

function fecharModal() {
    modal.style.display = "none";

    formulario.reset();

    compromissoEditando = null;

    tituloModal.textContent = "Novo compromisso";
    botaoSalvar.textContent = "Salvar compromisso";

    mensagemFormulario.textContent = "";
}

function abrirModalConfirmacao(itemId) {
    compromissoParaExcluir = itemId;

    modalConfirmacao.style.display = "flex";

    cancelarExclusao.focus();
}

function fecharModalConfirmacao() {
    modalConfirmacao.style.display = "none";

    compromissoParaExcluir = null;
}

function dataValida(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
    }

    const [ano, mes, dia] = data.split("-").map(Number);
    const dataTeste = new Date(ano, mes - 1, dia);

    return (
        dataTeste.getFullYear() === ano &&
        dataTeste.getMonth() === mes - 1 &&
        dataTeste.getDate() === dia
    );
}

function atualizarAvisoEvento() {
    if (!eventoAtual || !dataValida(eventoAtual.data || "")) {
        avisoEvento.textContent = "Data do evento não informada.";
        return;
    }

    const [ano, mes, dia] = eventoAtual.data.split("-").map(Number);

    const dataEvento = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const diferenca = Math.round(
        (dataEvento - hoje) / (1000 * 60 * 60 * 24)
    );

    avisoEvento.className = "aviso";

    if (diferenca < 0) {
        avisoEvento.textContent = "Este evento já passou.";
        avisoEvento.classList.add("encerrado");

    } else if (diferenca === 0) {
        avisoEvento.textContent = "Hoje é o grande dia! O evento acontece hoje.";
        avisoEvento.classList.add("hoje");

    } else if (diferenca <= 7) {
        avisoEvento.textContent = `Faltam apenas ${diferenca} dias para o evento!`;
        avisoEvento.classList.add("proximo");

    } else {
        avisoEvento.textContent = `Faltam ${diferenca} dias para o evento.`;
        avisoEvento.classList.add("futuro");
    }
}

async function carregarEvento() {
    if (!eventoId || eventoId.includes("/")) {
        nomeEvento.textContent = "Evento não informado";
        botaoNovo.disabled = true;

        mostrarMensagem("O endereço não contém um ID de evento válido.");

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
            id: documento.id,
            automatico: false
        }));

        if (eventoAtual && dataValida(eventoAtual.data || "")) {
            compromissos.push({
                id: "dia-do-evento",
                titulo: "Dia do evento",
                data: eventoAtual.data,
                horario: eventoAtual.horario || "",
                local: eventoAtual.local || "",
                responsaveis: "",
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

            return String(a.horario || "").localeCompare(
                String(b.horario || "")
            );
        });

        if (compromissos.length === 0) {
            const vazio = document.createElement("p");
            vazio.className = "aviso";
            vazio.textContent = "Nenhum compromisso cadastrado.";

            lista.appendChild(vazio);

            return true;
        }

        for (const item of compromissos) {
            lista.appendChild(criarCartao(item));
        }

        return true;

    } catch (erro) {
        console.error("Erro ao carregar compromissos:", erro);

        mostrarMensagem("Não foi possível carregar os compromissos.");

        return false;
    }
}

function criarCartao(item) {
    const cartao = document.createElement("article");
    cartao.className = "card-compromisso";

    if (item.automatico) {
        cartao.classList.add("dia-evento");
    }

    const dataHora = document.createElement("div");
    dataHora.className = "data-hora";

    const data = document.createElement("span");
    data.textContent = `Data: ${formatarData(item.data)}`;

    const horario = document.createElement("span");
    horario.textContent = `Horário: ${item.horario || "Não informado"}`;

    dataHora.append(data, horario);

    const detalhes = document.createElement("div");
    detalhes.className = "detalhes";

    const titulo = document.createElement("h3");
    titulo.textContent = item.titulo || "Sem título";

    const local = document.createElement("p");
    local.textContent = `Local: ${item.local || "Não informado"}`;

    const responsaveis = document.createElement("p");
    responsaveis.textContent = `Responsáveis: ${item.responsaveis || "Não informados"}`;

    const descricao = document.createElement("p");
    descricao.textContent = item.descricao || "Sem descrição";

    detalhes.append(
        titulo,
        local,
        responsaveis,
        descricao
    );

    cartao.append(dataHora, detalhes);

    if (!item.automatico) {
        const acoes = document.createElement("div");
        acoes.className = "acoes-compromisso";

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "editar";
        botaoEditar.textContent = "Editar";

        botaoEditar.addEventListener("click", () => {
            editarCompromisso(item);
        });

        const botaoExcluir = document.createElement("button");
        botaoExcluir.type = "button";
        botaoExcluir.className = "excluir";
        botaoExcluir.textContent = "Excluir";

        botaoExcluir.addEventListener("click", () => {
            abrirModalConfirmacao(item.id);
        });

        acoes.append(botaoEditar, botaoExcluir);

        cartao.appendChild(acoes);
    }

    return cartao;
}

function editarCompromisso(item) {
    if (!item || item.automatico) {
        return;
    }

    compromissoEditando = item.id;

    tituloInput.value = item.titulo || "";
    dataInput.value = item.data || "";
    horarioInput.value = item.horario || "";
    localInput.value = item.local || "";
    responsaveisInput.value = item.responsaveis || "";
    descricaoInput.value = item.descricao || "";

    tituloModal.textContent = "Editar compromisso";
    botaoSalvar.textContent = "Salvar alterações";

    mensagemFormulario.textContent = "";

    modal.style.display = "flex";

    tituloInput.focus();
}


formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!usuarioAtual || !eventoId) {
        mensagemFormulario.textContent = "Sua sessão ou o evento não está disponível.";
        return;
    }

    const titulo = tituloInput.value.trim();
    const data = dataInput.value;
    const horario = horarioInput.value;
    const local = localInput.value.trim();
    const responsaveis = responsaveisInput.value.trim();
    const descricao = descricaoInput.value.trim();

    if (!titulo || !data || !horario) {
        mensagemFormulario.textContent = "Preencha o título, a data e o horário.";
        return;
    }

    if (!dataValida(data)) {
        mensagemFormulario.textContent = "Informe uma data válida.";
        return;
    }

    if (
        titulo.length > 120 ||
        local.length > 150 ||
        responsaveis.length > 300 ||
        descricao.length > 2000
    ) {
        mensagemFormulario.textContent = "Um ou mais campos ultrapassaram o limite permitido.";
        return;
    }

    const dadosCompromisso = {
        titulo,
        data,
        horario,
        local,
        responsaveis,
        descricao
    };

    botaoSalvar.disabled = true;

    try {
        if (compromissoEditando) {
            const referencia = doc(
                firestore,
                "eventos",
                eventoId,
                "calendario",
                compromissoEditando
            );

            await updateDoc(referencia, dadosCompromisso);

            fecharModal();

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

            fecharModal();

            mostrarMensagem("Compromisso cadastrado com sucesso.", "sucesso");
        }

        await carregarCompromissos();

    } catch (erro) {
        console.error("Erro ao salvar compromisso:", erro);

        mensagemFormulario.textContent =
            "Não foi possível salvar. Verifique sua conexão e suas permissões.";

    } finally {
        botaoSalvar.disabled = false;

        if (compromissoEditando) {
            botaoSalvar.textContent = "Salvar alterações";
        } else {
            botaoSalvar.textContent = "Salvar compromisso";
        }
    }
});

async function excluirCompromisso(itemId) {
    if (!usuarioAtual || !eventoId || !itemId || itemId === "dia-do-evento") {
        mostrarMensagem("Não foi possível excluir este compromisso.");
        return false;
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

        mostrarMensagem("Compromisso excluído com sucesso.", "sucesso");

        await carregarCompromissos();

        return true;

    } catch (erro) {
        console.error("Erro ao excluir compromisso:", erro);

        mostrarMensagem("Não foi possível excluir o compromisso.");

        return false;
    }
}

botaoNovo.addEventListener("click", abrirModal);

botaoFechar.addEventListener("click", fecharModal);

cancelarExclusao.addEventListener("click", fecharModalConfirmacao);

confirmarExclusao.addEventListener("click", async () => {
    if (!compromissoParaExcluir) {
        return;
    }

    const itemId = compromissoParaExcluir;

    confirmarExclusao.disabled = true;

    const excluido = await excluirCompromisso(itemId);

    confirmarExclusao.disabled = false;

    if (excluido) {
        fecharModalConfirmacao();
    }
});

modal.addEventListener("click", (event) => {
    if (event.target === modal) {
        fecharModal();
    }
});

modalConfirmacao.addEventListener("click", (event) => {
    if (event.target === modalConfirmacao) {
        fecharModalConfirmacao();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (modalConfirmacao.style.display === "flex") {
            fecharModalConfirmacao();
        } else if (modal.style.display === "flex") {
            fecharModal();
        }
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
>>>>>>> 08ba6105e28b3725f671a5b3fe36eb7eaff9725e
