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


import { avisarColaboracao } from "./avisos.js";

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
let todosItens = [];
let diaSelecionado = null;
let mesVisivel = new Date();
mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth(), 1);
let cronometro = null;

const calGrade = document.getElementById("calGrade");
const calMes = document.getElementById("calMes");
const contagemEl = document.getElementById("contagem");
const filtroDiaEl = document.getElementById("filtroDia");

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

    desenharCalendario();

    if (!eventoId) {
        nomeEventoEl.textContent = "Evento não encontrado";
        listaEl.innerHTML = `
            <p class="aviso">
                Abra o calendário a partir da página de um evento.
            </p>
        `;

        botaoNovo.disabled = true;
        document.getElementById("cal").hidden = true;
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
            document.getElementById("cal").hidden = true;
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

    todosItens = itens;

    desenharCalendario();
    atualizarContagem();
    desenharLista();
}


// ---------- Calendário (grade do mês) ----------

function dataDoItem(item) {
    return dataParaOrdenar(item.data);
}

function iso(ano, mes, dia) {
    return ano + "-" + String(mes + 1).padStart(2, "0") + "-" + String(dia).padStart(2, "0");
}

function desenharCalendario() {

    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();

    calMes.textContent = MESES[mes] + " de " + ano;

    const comCompromisso = {};
    todosItens.forEach((item) => {
        comCompromisso[dataDoItem(item)] = (comCompromisso[dataDoItem(item)] || 0) + 1;
    });

    const primeiroDia = new Date(ano, mes, 1).getDay();
    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    const hoje = hojeISO();

    let html = "";

    for (let i = 0; i < primeiroDia; i++) {
        html += '<span class="cal-vazio"></span>';
    }

    for (let dia = 1; dia <= diasNoMes; dia++) {

        const chave = iso(ano, mes, dia);
        const qtd = comCompromisso[chave] || 0;

        const classes = ["cal-dia"];
        if (chave === hoje) classes.push("hoje");
        if (chave === diaSelecionado) classes.push("selecionado", "reinverter");
        if (qtd) classes.push("tem");

        const rotulo = dia + " de " + MESES[mes] +
            (qtd ? ", " + qtd + (qtd === 1 ? " compromisso" : " compromissos") : "");

        html += '<button type="button" class="' + classes.join(" ") + '" data-dia="' + chave + '"' +
            ' aria-label="' + rotulo + '"' +
            (chave === diaSelecionado ? ' aria-pressed="true"' : "") + '>' +
            '<span class="num">' + dia + '</span>' +
            (qtd ? '<span class="ponto reinverter"></span>' : "") +
            '</button>';
    }

    calGrade.innerHTML = html;
}


calGrade.addEventListener("click", (evento) => {

    const botao = evento.target.closest(".cal-dia");
    if (!botao) return;

    const chave = botao.getAttribute("data-dia");

    diaSelecionado = diaSelecionado === chave ? null : chave;

    desenharCalendario();
    desenharLista();
});

document.getElementById("mesAnterior").addEventListener("click", () => {
    mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() - 1, 1);
    desenharCalendario();
});

document.getElementById("mesSeguinte").addEventListener("click", () => {
    mesVisivel = new Date(mesVisivel.getFullYear(), mesVisivel.getMonth() + 1, 1);
    desenharCalendario();
});

calMes.addEventListener("click", () => {
    const agora = new Date();
    mesVisivel = new Date(agora.getFullYear(), agora.getMonth(), 1);
    desenharCalendario();
});

document.getElementById("verTodos").addEventListener("click", () => {
    diaSelecionado = null;
    desenharCalendario();
    desenharLista();
});


function desenharLista() {

    if (!diaSelecionado) {
        filtroDiaEl.hidden = true;
        desenhar(todosItens);
        return;
    }

    const doDia = todosItens.filter((item) => dataDoItem(item) === diaSelecionado);

    document.getElementById("filtroDiaTexto").textContent =
        "Compromissos de " + formatarData(diaSelecionado);

    filtroDiaEl.hidden = false;

    desenhar(doDia, "Nenhum compromisso neste dia.");
}


// ---------- Contagem regressiva até o próximo compromisso ----------

function alvoDoItem(item) {

    const partes = dataDoItem(item).split("-");
    if (partes.length !== 3) return null;

    const hm = /^(\d{1,2}):(\d{2})/.exec(item.horario || "");

    const alvo = new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2]),
        hm ? Number(hm[1]) : 0,
        hm ? Number(hm[2]) : 0,
        0
    );

    return isNaN(alvo.getTime()) ? null : alvo;
}

function proximoCompromisso() {

    const agora = new Date();
    const hoje = hojeISO();
    let melhor = null;

    todosItens.forEach((item) => {

        const alvo = alvoDoItem(item);
        if (!alvo) return;

        const semHora = !/^\d{1,2}:\d{2}/.test(item.horario || "");
        const ehHoje = dataDoItem(item) === hoje;

        // sem horário e hoje: ainda conta como "hoje"
        if (alvo <= agora && !(semHora && ehHoje)) return;

        if (!melhor || alvo < melhor.alvo) {
            melhor = { item: item, alvo: alvo, semHora: semHora, ehHoje: ehHoje };
        }
    });

    return melhor;
}

function somarMeses(base, n) {

    const alvo = new Date(
        base.getFullYear(), base.getMonth() + n, 1,
        base.getHours(), base.getMinutes(), base.getSeconds()
    );

    const dias = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    alvo.setDate(Math.min(base.getDate(), dias));

    return alvo;
}

function calcularRestante(agora, alvo) {

    let meses = (alvo.getFullYear() - agora.getFullYear()) * 12 +
        (alvo.getMonth() - agora.getMonth());

    while (meses > 0 && somarMeses(agora, meses) > alvo) meses--;

    const resto = Math.max(0, alvo - somarMeses(agora, meses));

    const seg = Math.floor(resto / 1000);

    return {
        anos: Math.floor(meses / 12),
        meses: meses % 12,
        dias: Math.floor(seg / 86400),
        horas: Math.floor((seg % 86400) / 3600),
        minutos: Math.floor((seg % 3600) / 60),
        segundos: seg % 60
    };
}

function plural(n, um, varios) {
    return n === 1 ? um : varios;
}

// Só mostra ano/mês/dia quando já são necessários.
function montarUnidades(r) {

    const todas = [
        { n: r.anos, um: "ano", varios: "anos" },
        { n: r.meses, um: "mês", varios: "meses" },
        { n: r.dias, um: "dia", varios: "dias" },
        { n: r.horas, um: "hora", varios: "horas" },
        { n: r.minutos, um: "min", varios: "min" },
        { n: r.segundos, um: "seg", varios: "seg" }
    ];

    let inicio = 0;
    while (inicio < todas.length - 2 && todas[inicio].n === 0) inicio++;

    return todas.slice(inicio);
}

function atualizarContagem() {

    clearInterval(cronometro);
    cronometro = null;

    const prox = proximoCompromisso();

    if (!prox) {
        contagemEl.hidden = true;
        return;
    }

    contagemEl.hidden = false;

    document.getElementById("contagemTitulo").textContent = prox.item.titulo || "Sem título";

    document.getElementById("contagemQuando").textContent =
        formatarData(prox.item.data) + (prox.item.horario ? " às " + prox.item.horario : "");

    const tempoEl = document.getElementById("contagemTempo");

    function tique() {

        const agora = new Date();

        if (prox.semHora && prox.ehHoje) {
            tempoEl.innerHTML = '<span class="contagem-hoje">É hoje!</span>';
            return;
        }

        if (agora >= prox.alvo) {
            // chegou a hora: procura o próximo
            atualizarContagem();
            return;
        }

        const unidades = montarUnidades(calcularRestante(agora, prox.alvo));

        tempoEl.innerHTML = unidades.map((u) =>
            '<div class="un"><strong>' + String(u.n).padStart(2, "0") + '</strong><span>' +
            plural(u.n, u.um, u.varios) + '</span></div>'
        ).join("");
    }

    tique();
    cronometro = setInterval(tique, 1000);
}


function desenhar(itens, textoVazio) {

    if (itens.length === 0) {
        listaEl.innerHTML = textoVazio
            ? `<p class="aviso">${textoVazio}</p>`
            : `
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
            "card-compromisso reinverter" +
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

        avisarColaboracao(db, auth.currentUser, eventoId, "calendario", "removeu", item.titulo);

        await carregarCalendario();

    } catch (erro) {
        mostrarErro(erro);
    }
}


function abrirModal() {

    form.reset();
    mensagemEl.textContent = "";

    if (diaSelecionado) dataInput.value = diaSelecionado;

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

        avisarColaboracao(db, auth.currentUser, eventoId, "calendario", "adicionou", titulo);

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
