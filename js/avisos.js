// ==========================================================
//  AVISOS DE COLABORAÇÃO  (js/avisos.js)
//
//  Quando alguém coloca ou remove algo numa ferramenta do evento,
//  os outros participantes (dono + colaboradores) recebem um aviso
//  na página de notificações (sininho).
//
//  Uso (nunca trava a tela: erros só vão para o console):
//      avisarColaboracao(db, usuario, eventoId, "tarefas", "adicionou", "Comprar bolo");
//
//  Para não encher a caixa de avisos, as ações iguais da mesma pessoa
//  na mesma ferramenta viram UM aviso só, com contador
//  ("Ana adicionou 5 itens em Tarefas"). Ao marcar como lido, o aviso some
//  e a contagem recomeça.
// ==========================================================

import { notificarServidor } from "./push.js";
import {
    collection, doc, getDoc, getDocs, setDoc, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

export const FERRAMENTAS = {
    evento:     { nome: "Evento",              pagina: "evento.html" },
    nexus:      { nome: "Nexus",               pagina: "nexus.html" },
    convite:    { nome: "Criador de convites", pagina: "convite.html" },
    pessoas:    { nome: "Pessoas",             pagina: "pessoas.html" },
    tarefas:    { nome: "Tarefas",             pagina: "tarefas.html" },
    financeiro: { nome: "Controle Financeiro", pagina: "controleFinanceiro.html" },
    presentes:  { nome: "Lista de Presentes",  pagina: "presentes.html" },
    convidados: { nome: "Convidados",          pagina: "convidados.html" },
    notas:      { nome: "Bloco de Notas",      pagina: "blocoNotas.html" },
    calendario: { nome: "Calendário",          pagina: "calendario.html" },
    documentos: { nome: "Documentos",           pagina: "documentos.html" }
};

function idSeguro(texto) {
    return String(texto).replace(/[^A-Za-z0-9_-]/g, "_");
}

// Texto mostrado na página de notificações (montado na hora, para refletir a contagem)
export function mensagemColaboracao(aviso) {
    const ferramenta = (FERRAMENTAS[aviso.ferramenta] || {}).nome || "uma ferramenta";
    const quem = aviso.autorNome || "Um colaborador";
    const evento = aviso.eventoNome ? ` — ${aviso.eventoNome}` : "";
    const qtd = Number(aviso.quantidade) || 1;
    const acao = ({ removeu: "removeu", editou: "editou", concluiu: "concluiu", comentou: "comentou" })[aviso.acao] || "adicionou";

    if (acao === "comentou") {
        return `${quem} comentou em "${aviso.ultimoItem || "uma anotação"}" no ${ferramenta}${evento}`;
    }

    if (qtd <= 1 && aviso.ultimoItem) {
        return `${quem} ${acao} "${aviso.ultimoItem}" em ${ferramenta}${evento}`;
    }
    return `${quem} ${acao} ${qtd} ${qtd === 1 ? "item" : "itens"} em ${ferramenta}${evento}`;
}

// categoria (para o liga/desliga) de qualquer aviso; avisos antigos não têm categoria
export function categoriaDoAviso(aviso) {
    if (aviso.tipo === "colaboracao" || aviso.tipo === "aceitou-convite" || aviso.tipo === "papel" || aviso.tipo === "presente" || aviso.tipo === "pix" || aviso.tipo === "presenca") return "colaboracao";
    if (aviso.tipo === "lembrete") return aviso.categoria || "";
    return "";
}

// lista de categorias que o usuário desligou em Notificações
export async function carregarDesligadas(db, uid) {
    try {
        const snap = await getDoc(doc(db, "usuarios", uid));
        const lista = snap.exists() ? snap.data().avisosDesligados : null;
        return Array.isArray(lista) ? lista : [];
    } catch (erro) {
        return [];
    }
}

export function paginaDaFerramenta(ferramenta, eventoId) {
    const pagina = (FERRAMENTAS[ferramenta] || {}).pagina || "evento.html";
    return pagina + "?id=" + encodeURIComponent(eventoId);
}

export async function avisarColaboracao(db, usuario, eventoId, ferramenta, acao, item) {
    try {
        if (!db || !usuario || !eventoId || !FERRAMENTAS[ferramenta]) return;

        const eventoSnap = await getDoc(doc(db, "eventos", eventoId));
        if (!eventoSnap.exists()) return;

        const evento = eventoSnap.data();

        // quem recebe: dono + colaboradores (visitantes não), menos quem fez a ação
        const destinatarios = new Set();
        if (evento.usuarioId) destinatarios.add(evento.usuarioId);

        const membros = await getDocs(collection(db, "eventos", eventoId, "membros"));
        membros.forEach((m) => {
            if (m.data().papel === "colaborador") destinatarios.add(m.id);
        });

        destinatarios.delete(usuario.uid);
        if (!destinatarios.size) return;

        const autorNome = String(usuario.displayName || usuario.email || "Um colaborador").slice(0, 60);
        const ultimoItem = String(item || "").slice(0, 60);

        await Promise.all([...destinatarios].map((uid) =>
            setDoc(
                doc(db, "avisos", idSeguro([uid, eventoId, ferramenta, acao, usuario.uid].join("__"))),
                {
                    tipo: "colaboracao",
                    uid,
                    eventoId,
                    eventoNome: String(evento.nome || "").slice(0, 100),
                    ferramenta,
                    acao,
                    autorUid: usuario.uid,
                    autorNome,
                    ultimoItem,
                    quantidade: increment(1),
                    lida: false,
                    dataCriacao: serverTimestamp()
                },
                { merge: true }
            )
        ));

        // push para quem está com o app fechado (o servidor confere tudo e limita a frequência)
        notificarServidor(usuario, { tipo: "colaboracao", eventoId, ferramenta, acao, item: ultimoItem, autorNome });
    } catch (erro) {
        console.warn("Não foi possível enviar o aviso de colaboração:", erro);
    }
}
