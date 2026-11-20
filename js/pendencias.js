// ==========================================================
//  PENDÊNCIAS E NOVIDADES DO EVENTO  (js/pendencias.js)
//
//  Tudo é guardado NESTE aparelho (localStorage), por usuário e evento,
//  sem mexer nas regras do Firestore:
//    pendencias_{uid}_{evento}  -> funções que o usuário já abriu
//    atividade_{uid}_{evento}   -> quando ele viu as novidades de cada função
//    visita_{uid}_{evento}      -> quando abriu a página do evento pela última vez
//
//  Usado por evento.html (bolinhas com número) e inicio.html (bolinha "!").
// ==========================================================

export const FUNCOES = [
    { k: "calendario", id: "linkCalendario", nome: "Calendário", icone: "fa-regular fa-calendar-days", ferr: "calendario" },
    { k: "tarefas", id: "linkTarefas", nome: "Tarefas", icone: "fa-solid fa-list-check", ferr: "tarefas" },
    { k: "financeiro", id: "linkControleFinanceiro", nome: "Controle orçamentário", icone: "fa-solid fa-coins", ferr: "financeiro" },
    { k: "notas", id: "linkBlocodeNotas", nome: "Bloco de notas", icone: "fa-regular fa-note-sticky", ferr: "notas" },
    { k: "presentes", id: "cardListaPresentes", nome: "Lista de presentes", icone: "fa-solid fa-gift", ferr: "presentes", flag: "listaPresentes" },
    { k: "convites", id: "cardCriadorConvites", nome: "Criador de convites", icone: "fa-solid fa-envelope-open-text", ferr: "convite", flag: "criadorConvites" },
    { k: "convidados", id: null, nome: "Convidados", icone: "fa-solid fa-user-check", ferr: "convidados" },
    { k: "regras", id: null, nome: "Regras de confirmação", icone: "fa-solid fa-clipboard-check", ferr: null, dono: true }
];

// tipos de aviso que contam como "novidade" (o de presença é tratado à parte, pela lista de convidados)
const TIPOS_NOVIDADE = ["colaboracao", "presente", "pix"];

function ler(chave, padrao) {
    try {
        const v = JSON.parse(localStorage.getItem(chave));
        return v == null ? padrao : v;
    } catch (e) { return padrao; }
}

function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento: as bolinhas voltam */ }
}

export function millis(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.seconds === "number") return ts.seconds * 1000;
    return Number(ts) || 0;
}

// ---------- funções que o usuário ainda não abriu ----------
export function lerVistas(uid, eventoId) {
    const v = ler(`pendencias_${uid}_${eventoId}`, []);
    return Array.isArray(v) ? v : [];
}

export function marcarVista(uid, eventoId, k) {
    const v = lerVistas(uid, eventoId);
    if (!v.includes(k)) { v.push(k); gravar(`pendencias_${uid}_${eventoId}`, v); }
}

export function funcoesDoEvento(evento, souDono) {
    return FUNCOES.filter((f) => (!f.flag || evento[f.flag]) && (!f.dono || souDono));
}

export function pendentesDoEvento(uid, evento, souDono) {
    const vistas = lerVistas(uid, eventoIdDe(evento));
    return funcoesDoEvento(evento, souDono).filter((f) => !vistas.includes(f.k));
}

function eventoIdDe(evento) { return evento.id; }

// ---------- novidades (o que mudou depois que o usuário viu) ----------
export function atividadeVista(uid, eventoId) {
    const m = ler(`atividade_${uid}_${eventoId}`, {});
    return m && typeof m === "object" ? m : {};
}

export function marcarAtividadeVista(uid, eventoId, k) {
    const m = atividadeVista(uid, eventoId);
    m[k] = Date.now();
    gravar(`atividade_${uid}_${eventoId}`, m);
}

// avisos (dados) -> { funcao: quantidade de novidades }
export function contarNovidades(avisos, eventoId, mapaVisto) {
    const n = {};
    avisos.forEach((a) => {
        if (a.eventoId !== eventoId || !TIPOS_NOVIDADE.includes(a.tipo)) return;
        const f = FUNCOES.find((x) => x.ferr && x.ferr === a.ferramenta);
        if (!f || f.k === "convidados") return;
        if (millis(a.dataCriacao) <= (mapaVisto[f.k] || 0)) return;
        n[f.k] = (n[f.k] || 0) + (Number(a.quantidade) || 1);
    });
    return n;
}

// ---------- última visita à página do evento (para a bolinha "!" da página inicial) ----------
export function ultimaVisita(uid, eventoId) {
    return Number(ler(`visita_${uid}_${eventoId}`, 0)) || 0;
}

export function marcarVisita(uid, eventoId) {
    gravar(`visita_${uid}_${eventoId}`, Date.now());
}

// há aviso (de qualquer tipo de atividade) mais novo que a última visita?
export function temNovidadeDesdeVisita(avisos, uid, eventoId) {
    const desde = ultimaVisita(uid, eventoId);
    return avisos.some((a) => a.eventoId === eventoId &&
        (TIPOS_NOVIDADE.includes(a.tipo) || a.tipo === "presenca") &&
        millis(a.dataCriacao) > desde);
}
