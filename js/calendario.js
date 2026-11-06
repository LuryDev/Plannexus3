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
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";


const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);


const nomeEventoEl = document.getElementById("nomeEvento");
const listaEl = document.getElementById("listaCompromissos");
const voltarEl = document.getElementById("voltar");
const botaoNovo = document.getElementById("botaoNovo");
const modal = document.getElementById("modal");
const form = document.getElementById("formCompromisso");
const botaoSalvar = document.getElementById("botaoSalvar");
const mensagemEl = document.getElementById("mensagem");

const tituloInput = document.getElementById("tituloCompromisso");
const dataInput = document.getElementById("dataCompromisso");
const horarioInput = document.getElementById("horarioCompromisso");
const descricaoInput = document.getElementById("descricaoCompromisso");
const fecharModalBtn = document.getElementById("fecharModal");

const eventoId = pegarIdDaUrl();

let souVisitante = false;

const MESES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];


async function iniciar() {

    if (!eventoId) {
        nomeEventoEl.textContent = "Evento não encontrado";
        listaEl.innerHTML = `
            <p class="aviso">
                Abra o calendário a partir da página de um evento.
            </p>
        `;

        botaoNovo.disabled = true;
        return;
    }

    voltarEl.href = `evento.html?id=${encodeURIComponent(eventoId)}`;

    try {
        const usuario = await exigirLogin(auth, onAuthStateChanged);
        if (!usuario) return;

        const eventoSnap = await getDoc(
            doc(db, "eventos", eventoId)
        );

        if (!eventoSnap.exists()) {
            nomeEventoEl.textContent = "Evento não encontrado";

            listaEl.innerHTML = `
                <p class="aviso">
                    Esse evento não existe mais.
                </p>
            `;

            botaoNovo.disabled = true;
            return;
        }

        const evento = eventoSnap.data();

        nomeEventoEl.textContent = evento.nome || "Evento sem nome";

        // Visitante só visualiza: esconde o botão de novo compromisso.
        if (evento.usuarioId !== usuario.uid) {
            const membroSnap = await getDoc(
                doc(db, "eventos", eventoId, "membros", usuario.uid)
            );
            const papel = membroSnap.exists() ? membroSnap.data().papel : null;
            souVisitante = papel === "visitante";
            botaoNovo.hidden = souVisitante;
        }

        await carregarCalendario();

    } catch (erro) {
        mostrarErro(erro);
    }
}


async function carregarCalendario() {

    const snap = await getDocs(
        collection(db, "eventos", eventoId, "calendario")
    );

    const itens = snap.docs.map((documento) => ({
        id: documento.id,
        ...documento.data()
    }));

    itens.sort((a, b) => {

        const dataA = dataParaOrdenar(a.data) + (a.horario || "99:99");
        const dataB = dataParaOrdenar(b.data) + (b.horario || "99:99");

        return dataA.localeCompare(dataB);
    });

    desenhar(itens);
}


function desenhar(itens) {

    if (itens.length === 0) {
        listaEl.innerHTML = `
            <p class="aviso">
                Nenhum compromisso marcado.<br>
                Toque em <strong>Novo</strong> para adicionar.
            </p>
        `;

        return;
    }

    listaEl.innerHTML = "";

    const hoje = hojeISO();
    let mesAnterior = null;

    itens.forEach((item) => {

        const dataISO = dataParaOrdenar(item.data);
        const [ano, mes] = dataISO.split("-");
        const chaveMes = `${ano}-${mes}`;

        if (
            chaveMes !== mesAnterior &&
            MESES[Number(mes) - 1]
        ) {
            const separador = document.createElement("h3");

            separador.className = "mes";
            separador.textContent = `${MESES[Number(mes) - 1]} de ${ano}`;

            listaEl.appendChild(separador);

            mesAnterior = chaveMes;
        }

        const card = document.createElement("article");

        card.className =
            "card-compromisso" +
            (dataISO < hoje ? " passado" : "");

        card.innerHTML = `
            <div class="data-hora">

                <span class="data">
                    <i class="fa-regular fa-calendar"></i>
                    ${escaparHTML(formatarData(item.data) || "Sem data")}
                </span>

                <span class="hora">
                    <i class="fa-regular fa-clock"></i>
                    ${escaparHTML(item.horario || "Sem horário")}
                </span>

                ${dataISO === hoje
                    ? `<span class="hoje">Hoje</span>`
                    : ""
                }

            </div>

            <div class="detalhes">
                <h3>${escaparHTML(item.titulo || "Sem título")}</h3>

                ${item.descricao
                    ? `<p>${escaparHTML(item.descricao)}</p>`
                    : ""
                }
            </div>

            ${souVisitante ? "" : `
            <button
                class="excluir"
                type="button"
                title="Excluir compromisso"
                aria-label="Excluir compromisso"
            >
                <i class="fa-regular fa-trash-can"></i>
            </button>`}
        `;

        if (!souVisitante) {
            card
                .querySelector(".excluir")
                .addEventListener("click", () => excluir(item));
        }

        listaEl.appendChild(card);
    });
}


async function excluir(item) {

    if (!confirm(`Excluir "${item.titulo || "este compromisso"}"?`)) {
        return;
    }

    try {
        await deleteDoc(
            doc(db, "eventos", eventoId, "calendario", item.id)
        );

        await carregarCalendario();

    } catch (erro) {
        mostrarErro(erro);
    }
}


function abrirModal() {

    form.reset();
    mensagemEl.textContent = "";

    modal.hidden = false;

    tituloInput.focus();
}


function fecharModal() {
    modal.hidden = true;
}


botaoNovo.addEventListener("click", abrirModal);

fecharModalBtn.addEventListener("click", fecharModal);


modal.addEventListener("click", (evento) => {

    if (evento.target === modal) {
        fecharModal();
    }
});


document.addEventListener("keydown", (evento) => {

    if (evento.key === "Escape" && !modal.hidden) {
        fecharModal();
    }
});


form.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const titulo = tituloInput.value.trim();
    const data = dataInput.value;
    const horario = horarioInput.value;
    const descricao = descricaoInput.value.trim();

    if (!titulo || !data) {
        mensagemEl.textContent = "Preencha o título e a data.";
        return;
    }

    if (!eventoId) {
        mensagemEl.textContent = "Não foi possível identificar o evento.";
        return;
    }

    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";

    try {

        await addDoc(
            collection(db, "eventos", eventoId, "calendario"),
            {
                titulo,
                data,
                horario,
                descricao,
                criadoEm: serverTimestamp()
            }
        );

        fecharModal();

        await carregarCalendario();

    } catch (erro) {

        console.error("Erro ao salvar compromisso:", erro);

        mensagemEl.textContent =
            "Não foi possível salvar o compromisso.";

    } finally {

        botaoSalvar.disabled = false;
        botaoSalvar.textContent = "Salvar compromisso";
    }
});


function mostrarErro(erro) {

    console.error("Erro no calendário:", erro);

    const semPermissao =
        erro && erro.code === "permission-denied";

    listaEl.innerHTML = `
        <p class="aviso erro">
            ${
                semPermissao
                    ? "Sem permissão para acessar o calendário. Confira as regras do Firestore."
                    : "Erro ao carregar o calendário. Veja o console (F12)."
            }
        </p>
    `;
}
iniciar();
