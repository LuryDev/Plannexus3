// ==========================================================
//  /api/push  -  push das ações feitas no app
//
//  O app chama esta rota (com o login do usuário) logo depois de uma ação
//  que deve avisar outra pessoa. O servidor confere se quem chamou
//  realmente pode fazer aquilo e manda a notificação.
//
//  tipo "colaboracao"  { eventoId, ferramenta, acao, item, autorNome }
//  tipo "convite"      { conviteId }   -> avisa quem foi convidado (dono chamou)
//  tipo "aceitou"      { conviteId }   -> avisa o dono (convidado chamou)
//  tipo "papel"        { eventoId, alvoUid } -> avisa quem mudou de cargo (dono chamou)
// ==========================================================

import { iniciarFirebase, verificarToken } from "./nexus.js";
import { enviarPush, categoriasDesligadas, TITULOS } from "./_push.js";

const FERRAMENTAS = {
    tarefas:    { nome: "Tarefas",             pagina: "tarefas.html" },
    financeiro: { nome: "Controle Financeiro", pagina: "controleFinanceiro.html" },
    presentes:  { nome: "Lista de Presentes",  pagina: "presentes.html" },
    notas:      { nome: "Bloco de Notas",      pagina: "blocoNotas.html" },
    calendario: { nome: "Calendário",          pagina: "calendario.html" }
};
const VERBOS = { adicionou: "adicionou", removeu: "removeu", editou: "editou", concluiu: "concluiu", comentou: "comentou em" };
const INTERVALO_MS = 10 * 60 * 1000;   // no máximo 1 push por pessoa/ferramenta a cada 10 min

function texto(v, max) {
    return String(v || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
}

export function mensagemPush({ autorNome, acao, ferramenta, item, eventoNome }) {
    const quem = texto(autorNome, 60) || "Um colaborador";
    const verbo = VERBOS[acao] || "adicionou";
    const onde = (FERRAMENTAS[ferramenta] || {}).nome || "o evento";
    const coisa = item ? ` "${texto(item, 60)}"` : "";
    return `${quem} ${verbo}${coisa} em ${onde} — ${texto(eventoNome, 80)}`.replace(/ — $/, "");
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ erro: "Servidor não configurado." });
    }

    let fb;
    let usuario;

    try {
        fb = await iniciarFirebase();
        const cabecalho = String(req.headers.authorization || "");
        const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
        usuario = await verificarToken(token, fb.projectId);
    } catch (erro) {
        return res.status(401).json({ erro: "Sessão inválida." });
    }

    const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    try {
        if (corpo.tipo === "colaboracao") {
            const eventoId = texto(corpo.eventoId, 100);
            const ferramenta = texto(corpo.ferramenta, 20);
            if (!eventoId || !FERRAMENTAS[ferramenta]) return res.status(400).json({ erro: "Dados inválidos." });

            const eventoRef = fb.db.collection("eventos").doc(eventoId);
            const eventoSnap = await eventoRef.get();
            if (!eventoSnap.exists) return res.status(404).json({ erro: "Evento não encontrado." });

            const evento = eventoSnap.data();
            if (evento.arquivado === true) return res.status(200).json({ ok: true, enviados: 0, arquivado: true });   // arquivado: sem avisos
            const membros = await eventoRef.collection("membros").get();

            const colaboradores = new Set();
            if (evento.usuarioId) colaboradores.add(evento.usuarioId);
            membros.forEach((m) => { if (m.data().papel === "colaborador") colaboradores.add(m.id); });

            // quem chama precisa ser dono ou colaborador
            if (!colaboradores.has(usuario.uid)) return res.status(403).json({ erro: "Sem permissão." });

            colaboradores.delete(usuario.uid);

            const acao = VERBOS[corpo.acao] ? corpo.acao : "adicionou";
            const mensagem = mensagemPush({
                autorNome: corpo.autorNome, acao, ferramenta, item: corpo.item, eventoNome: evento.nome
            });

            let enviados = 0;

            for (const uid of colaboradores) {
                if ((await categoriasDesligadas(fb, uid)).includes("colaboracao")) continue;

                // limite: não manda de novo se já mandou há pouco
                const controle = fb.db.collection("pushControle")
                    .doc(`${uid}__${eventoId}__${ferramenta}__${usuario.uid}`.replace(/[^A-Za-z0-9_-]/g, "_"));
                const anterior = await controle.get();
                const ultimo = anterior.exists && anterior.data().em ? anterior.data().em.toMillis() : 0;
                if (Date.now() - ultimo < INTERVALO_MS) continue;

                await controle.set({ em: fb.FieldValue.serverTimestamp() });

                enviados += await enviarPush(fb, uid, {
                    titulo: TITULOS.colaboracao,
                    corpo: mensagem,
                    url: `/${FERRAMENTAS[ferramenta].pagina}?id=${encodeURIComponent(eventoId)}`,
                    tag: `colab-${eventoId}-${ferramenta}`
                });
            }

            return res.status(200).json({ ok: true, enviados });
        }

        if (corpo.tipo === "papel") {
            const eventoId = texto(corpo.eventoId, 100);
            const alvoUid = texto(corpo.alvoUid, 128);
            if (!eventoId || !alvoUid) return res.status(400).json({ erro: "Dados inválidos." });

            const eventoRef = fb.db.collection("eventos").doc(eventoId);
            const eventoSnap = await eventoRef.get();
            if (!eventoSnap.exists) return res.status(404).json({ erro: "Evento não encontrado." });

            const evento = eventoSnap.data();

            // só o dono muda cargos, e o cargo novo é lido do banco (não do que o app mandou)
            if (evento.usuarioId !== usuario.uid) return res.status(403).json({ erro: "Sem permissão." });

            const membroSnap = await eventoRef.collection("membros").doc(alvoUid).get();
            if (!membroSnap.exists) return res.status(404).json({ erro: "Pessoa não encontrada no evento." });

            if ((await categoriasDesligadas(fb, alvoUid)).includes("colaboracao")) {
                return res.status(200).json({ ok: true, enviados: 0 });
            }

            const cargo = membroSnap.data().papel === "colaborador" ? "colaborador" : "visitante";
            const enviados = await enviarPush(fb, alvoUid, {
                titulo: TITULOS.papel,
                corpo: `Agora você é ${cargo} do evento "${texto(evento.nome, 80)}".`,
                url: `/evento.html?id=${encodeURIComponent(eventoId)}`,
                tag: `papel-${eventoId}`
            });
            return res.status(200).json({ ok: true, enviados });
        }

        if (corpo.tipo === "convite" || corpo.tipo === "aceitou") {
            const conviteId = texto(corpo.conviteId, 100);
            if (!conviteId) return res.status(400).json({ erro: "Dados inválidos." });

            const conviteSnap = await fb.db.collection("convites").doc(conviteId).get();
            if (!conviteSnap.exists) return res.status(404).json({ erro: "Convite não encontrado." });

            const convite = conviteSnap.data();

            if (corpo.tipo === "convite") {
                if (convite.donoId !== usuario.uid || convite.status !== "pendente") {
                    return res.status(403).json({ erro: "Sem permissão." });
                }

                // acha o usuário pelo e-mail gravado no perfil (sem usar o firebase-admin/auth,
                // que não carrega bem na Vercel; mesmo motivo do /api/nexus)
                const email = String(convite.emailConvidado || "").trim();
                let achado = await fb.db.collection("usuarios").where("email", "==", email.toLowerCase()).limit(1).get();
                if (achado.empty && email !== email.toLowerCase()) {
                    achado = await fb.db.collection("usuarios").where("email", "==", email).limit(1).get();
                }
                if (achado.empty) {
                    return res.status(200).json({ ok: true, enviados: 0 });   // ainda não tem conta
                }
                const convidado = { uid: achado.docs[0].id };

                const enviados = await enviarPush(fb, convidado.uid, {
                    titulo: TITULOS.convite,
                    corpo: `Você foi convidado(a) para colaborar no evento "${texto(convite.eventoNome, 80)}".`,
                    url: "/notificacoes.html",
                    tag: "convite-" + conviteId
                });
                return res.status(200).json({ ok: true, enviados });
            }

            // aceitou
            if (convite.status !== "aceito" || !usuario.email ||
                String(convite.emailConvidado).toLowerCase() !== usuario.email.toLowerCase()) {
                return res.status(403).json({ erro: "Sem permissão." });
            }

            if ((await categoriasDesligadas(fb, convite.donoId)).includes("colaboracao")) {
                return res.status(200).json({ ok: true, enviados: 0 });
            }

            const enviados = await enviarPush(fb, convite.donoId, {
                titulo: TITULOS.aceitou,
                corpo: `${texto(corpo.autorNome, 60) || usuario.email} aceitou seu convite para o evento "${texto(convite.eventoNome, 80)}".`,
                url: "/notificacoes.html",
                tag: "aceitou-" + conviteId
            });
            return res.status(200).json({ ok: true, enviados });
        }

        return res.status(400).json({ erro: "Tipo inválido." });
    } catch (erro) {
        console.error("PUSH: erro", erro.code || "", erro.message);
        return res.status(500).json({ erro: "Não foi possível enviar.", detalhe: String(erro.code || erro.message || "").slice(0, 120) });
    }
}
