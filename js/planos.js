// ==========================================================
//  PLANOS (app)  -  gratuito x pago
//
//  O plano fica em usuarios/{uid} (plano + planoAte) e só o servidor grava.
//  Os mesmos números estão em api/_plano.js (que é quem realmente confere
//  Nexus e anexos). Mudou aqui, mude lá também.
//
//  Princípio: o limite é avisado ANTES de a pessoa investir tempo, e nada
//  que ela já criou é apagado ou trancado.
// ==========================================================

import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { ofertaDePlanos } from "./planoPopup.js";

// FASE DE TESTES: enquanto for true, o limite de eventos ativos NÃO é aplicado.
// Para ligar o limite de 3 eventos no gratuito, troque para false (e faça o mesmo em api/_plano.js).
export const FASE_DE_TESTES = true;

export const LIMITES = {
    gratis: { eventosAtivos: FASE_DE_TESTES ? Infinity : 3, nexusPorMes: 40,  anexosPorEvento: 3 },
    pago:   { eventosAtivos: Infinity, nexusPorMes: 600, anexosPorEvento: 10 }
};

const PLANOS_PAGOS = ["passe", "temporada", "anual"];

export const NOMES_PLANOS = {
    gratis: "Gratuito",
    passe: "Passe de 1 evento",
    temporada: "Temporada de 3 meses",
    anual: "Anual"
};

function paraMillis(v) {
    if (!v) return 0;
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v.seconds === "number") return v.seconds * 1000;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
}

export function tipoDoPlano(dados, agora = Date.now()) {
    if (!dados || !PLANOS_PAGOS.includes(dados.plano)) return "gratis";
    return paraMillis(dados.planoAte) > agora ? "pago" : "gratis";
}

export async function planoDoUsuario(db, uid) {
    let dados = null;
    try {
        const snap = await getDoc(doc(db, "usuarios", uid));
        dados = snap.exists() ? snap.data() : null;
    } catch (erro) {
        console.warn("Plano: não foi possível ler o plano:", erro && erro.message);
    }
    const tipo = tipoDoPlano(dados);
    return { tipo, nome: tipo === "pago" ? NOMES_PLANOS[dados.plano] : NOMES_PLANOS.gratis, ...LIMITES[tipo] };
}

// eventos ativos = os seus que NÃO estão arquivados (arquivar libera uma vaga)
export async function contarEventosAtivos(db, uid) {
    const snap = await getDocs(query(collection(db, "eventos"), where("usuarioId", "==", uid)));
    return snap.docs.filter((d) => d.data().arquivado !== true).length;
}

export async function situacaoEventos(db, uid) {
    const [plano, ativos] = await Promise.all([planoDoUsuario(db, uid), contarEventosAtivos(db, uid)]);
    return { plano, ativos, limite: plano.eventosAtivos, noLimite: ativos >= plano.eventosAtivos };
}

// Mostra a oferta dos planos (pop-up animado em js/planoPopup.js).
// Quem já tem eventos além do limite continua com todos eles.
export function mostrarAvisoLimite({ ativos, limite }) {
    ofertaDePlanos("eventos", { ativos, limite, recado: "Você chegou ao limite de eventos do plano gratuito." });
}

// Atalho para as telas de criar evento: confere o limite e, se estourou, mostra o aviso.
// Devolve true se pode continuar.
export async function podeCriarEvento(db, uid) {
    try {
        const s = await situacaoEventos(db, uid);
        if (s.noLimite) {
            mostrarAvisoLimite({ ativos: s.ativos, limite: s.limite });
            return false;
        }
    } catch (erro) {
        console.warn("Plano: não foi possível conferir o limite:", erro && erro.message);   // na dúvida, deixa criar
    }
    return true;
}
