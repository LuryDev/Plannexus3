// ==========================================================
//  /api/presenca  -  confirmação de presença pelo link do convite
//
//  Quem recebe o link NÃO precisa de conta. A página pública não fala direto
//  com o Firestore: ela chama esta rota, que confere tudo.
//
//  Com login (dono ou colaborador do evento):
//    { acao: "estado",    eventoId }              -> { ativo, token }
//    { acao: "criar",     eventoId }              -> { token }   (reaproveita o link ativo)
//    { acao: "desativar", eventoId }              -> o link antigo para de funcionar
//    { acao: "remover",   eventoId, presencaId }  -> apaga uma confirmação
//  Com login (qualquer pessoa do evento):
//    { acao: "lista",     eventoId }              -> { evento, esperados, confirmados: [{id, nome}] }
//
//  Sem login (convidado):
//    { acao: "ver",       token, dispositivo }    -> dados do evento (+ jaConfirmou)
//    { acao: "confirmar", token, nome, email, dispositivo } -> registra a presença
//      (bloqueia e-mail repetido E aparelho que já confirmou)
//
//  O e-mail e o código do aparelho servem só para impedir confirmação repetida:
//  guardamos apenas um código (hash) deles, nunca o e-mail em si, e o
//  organizador vê só o nome.
//
//  Os dados ficam em coleções SEM regra para o app (só este servidor acessa):
//    confirmacoesPublicas/{token}        -> { eventoId, donoUid }
//    presencas/{eventoId}_{hashDoEmail}  -> { eventoId, nome, criadoEm }
// ==========================================================

import { createHash, randomBytes } from "node:crypto";
import { iniciarFirebase, verificarToken } from "./nexus.js";
import { enviarPush, categoriasDesligadas } from "./_push.js";

function texto(v, max) {
    return String(v || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function tokenValido(t) {
    return typeof t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(t);
}

function novoToken() {
    return randomBytes(18).toString("base64url");   // 24 caracteres
}

function emailValido(e) {
    return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function hashDoEmail(email) {
    return createHash("sha256").update(email).digest("hex").slice(0, 40);
}

// código do aparelho (guardado no navegador do convidado); só o hash vai para o banco
function dispositivoValido(d) {
    return typeof d === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(d);
}

function hashDoDispositivo(d) {
    return createHash("sha256").update("dispositivo:" + d).digest("hex").slice(0, 40);
}

// este aparelho já confirmou presença neste evento?
async function aparelhoJaConfirmou(fb, eventoId, dispositivo) {
    if (!dispositivoValido(dispositivo)) return null;
    const achado = await fb.db.collection("presencas")
        .where("eventoId", "==", eventoId)
        .where("dispositivo", "==", hashDoDispositivo(dispositivo))
        .limit(1).get();
    return achado.empty ? null : respostaDe(achado.docs[0].data());
}

// registros antigos não têm o campo: contam como "vai"
function respostaDe(dados) {
    return dados && dados.resposta === "nao" ? "nao" : "sim";
}

async function usuarioDaRequisicao(req, fb) {
    const cabecalho = String(req.headers.authorization || "");
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
    return verificarToken(token, fb.projectId);
}

// dono (ou colaborador); com { qualquerMembro: true } aceita também visitantes do evento
async function permissaoNoEvento(fb, eventoId, uid, { qualquerMembro = false } = {}) {
    const eventoRef = fb.db.collection("eventos").doc(eventoId);
    const eventoSnap = await eventoRef.get();
    if (!eventoSnap.exists) return { ok: false, status: 404, erro: "Evento não encontrado." };

    const evento = eventoSnap.data();
    if (evento.usuarioId === uid) return { ok: true, evento };

    const membro = await eventoRef.collection("membros").doc(uid).get();
    if (membro.exists && (qualquerMembro || membro.data().papel === "colaborador")) return { ok: true, evento };

    return { ok: false, status: 403, erro: "Sem permissão." };
}

// quem abriu o link é o organizador (dono/colaborador) logado? Visitante sem login -> false
async function ehOrganizador(req, fb, eventoId) {
    if (!String(req.headers.authorization || "").startsWith("Bearer ")) return false;
    try {
        const usuario = await usuarioDaRequisicao(req, fb);
        const permissao = await permissaoNoEvento(fb, eventoId, usuario.uid);
        return !!permissao.ok;
    } catch (e) {
        return false;
    }
}

async function linkDoEvento(fb, eventoId) {
    const achado = await fb.db.collection("confirmacoesPublicas").where("eventoId", "==", eventoId).limit(1).get();
    return achado.empty ? null : achado.docs[0];
}

function milissegundos(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts._seconds === "number") return ts._seconds * 1000;
    return Number(ts) || 0;
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ erro: "Servidor não configurado." });
    }

    let corpo;
    try {
        corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
        return res.status(400).json({ erro: "Pedido inválido." });
    }

    try {
        const fb = await iniciarFirebase();
        const acao = texto(corpo.acao, 20);

        // ================= ÁREA DO ORGANIZADOR =================
        if (["estado", "criar", "desativar", "remover", "lista"].includes(acao)) {
            let usuario;
            try {
                usuario = await usuarioDaRequisicao(req, fb);
            } catch (e) {
                return res.status(401).json({ erro: "Sessão inválida." });
            }

            const eventoId = texto(corpo.eventoId, 100);
            if (!eventoId) return res.status(400).json({ erro: "Dados inválidos." });

            const permissao = await permissaoNoEvento(fb, eventoId, usuario.uid, { qualquerMembro: acao === "lista" });
            if (!permissao.ok) return res.status(permissao.status).json({ erro: permissao.erro });

            if (acao === "lista") {
                const snap = await fb.db.collection("presencas").where("eventoId", "==", eventoId).get();
                const todos = snap.docs
                    .map((d) => ({ id: d.id, nome: texto(d.data().nome, 60), resposta: respostaDe(d.data()), quando: milissegundos(d.data().criadoEm) }))
                    .sort((a, b) => a.quando - b.quando)
                    .map(({ id, nome, resposta }) => ({ id, nome, resposta }));
                const confirmados = todos.filter((x) => x.resposta === "sim").map(({ id, nome }) => ({ id, nome }));
                const ausentes = todos.filter((x) => x.resposta === "nao").map(({ id, nome }) => ({ id, nome }));
                const esperados = Number(permissao.evento.convidados) > 0 ? Number(permissao.evento.convidados) : 0;
                return res.status(200).json({
                    ok: true,
                    evento: texto(permissao.evento.nome, 120),
                    esperados,
                    confirmados,
                    ausentes
                });
            }

            if (acao === "remover") {
                const presencaId = texto(corpo.presencaId, 120);
                // só apaga confirmações DESTE evento
                if (!presencaId.startsWith(eventoId + "_")) return res.status(400).json({ erro: "Confirmação inválida." });
                await fb.db.collection("presencas").doc(presencaId).delete();
                return res.status(200).json({ ok: true });
            }

            const atual = await linkDoEvento(fb, eventoId);

            if (acao === "estado") {
                return res.status(200).json({ ok: true, ativo: !!atual, token: atual ? atual.id : null });
            }

            if (acao === "desativar") {
                if (atual) await atual.ref.delete();
                return res.status(200).json({ ok: true, ativo: false });
            }

            if (atual) return res.status(200).json({ ok: true, ativo: true, token: atual.id });

            const token = novoToken();
            await fb.db.collection("confirmacoesPublicas").doc(token).set({
                eventoId,
                donoUid: permissao.evento.usuarioId || usuario.uid,
                criadoEm: fb.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ ok: true, ativo: true, token });
        }

        // ================= ÁREA PÚBLICA =================
        const token = corpo.token;
        if (!tokenValido(token)) return res.status(404).json({ erro: "Link inválido ou desativado." });

        const linkSnap = await fb.db.collection("confirmacoesPublicas").doc(token).get();
        if (!linkSnap.exists) return res.status(404).json({ erro: "Link inválido ou desativado." });

        const eventoId = linkSnap.data().eventoId;
        const eventoSnap = await fb.db.collection("eventos").doc(eventoId).get();
        if (!eventoSnap.exists) return res.status(404).json({ erro: "Este convite não existe mais." });

        const evento = eventoSnap.data();

        if (acao === "ver") {
            const organizador = await ehOrganizador(req, fb, eventoId);
            return res.status(200).json({
                ok: true,
                organizador,
                eventoId: organizador ? eventoId : undefined,
                ...(await (async () => {
                    const anterior = await aparelhoJaConfirmou(fb, eventoId, corpo.dispositivo);
                    return { jaConfirmou: !!anterior, respostaAnterior: anterior || undefined };
                })()),
                evento: texto(evento.nome, 120),
                data: texto(evento.data, 10),
                horario: texto(evento.horario, 5),
                local: texto(evento.local, 120)
            });
        }

        if (acao === "confirmar") {
            // campo-isca: robôs preenchem, pessoas não veem
            if (corpo.site) return res.status(200).json({ ok: true });

            const nome = texto(corpo.nome, 60);
            const email = texto(corpo.email, 120).toLowerCase();
            const resposta = corpo.resposta === "nao" ? "nao" : "sim";

            if (await ehOrganizador(req, fb, eventoId)) {
                return res.status(403).json({ erro: "Você é o organizador deste evento e não precisa confirmar presença." });
            }

            if (nome.length < 2) return res.status(400).json({ erro: "Digite seu nome." });
            if (!emailValido(email)) return res.status(400).json({ erro: "Digite um e-mail válido." });

            // mesmo aparelho (navegador) já confirmou: bloqueia, mesmo com outro e-mail
            const respostaDoAparelho = await aparelhoJaConfirmou(fb, eventoId, corpo.dispositivo);
            if (respostaDoAparelho) {
                return res.status(409).json({ erro: "Você já respondeu a este convite!", resposta: respostaDoAparelho });
            }

            const ref = fb.db.collection("presencas").doc(eventoId + "_" + hashDoEmail(email));

            try {
                await ref.create({
                    eventoId,
                    nome,
                    resposta,
                    dispositivo: dispositivoValido(corpo.dispositivo) ? hashDoDispositivo(corpo.dispositivo) : "",
                    criadoEm: fb.FieldValue.serverTimestamp()
                });
            } catch (e) {
                // 6 = ALREADY_EXISTS: esse e-mail já confirmou
                if (e && (e.code === 6 || e.code === "already-exists" || /already exists/i.test(String(e.message)))) {
                    let anterior = "sim";
                    try { anterior = respostaDe((await ref.get()).data()); } catch (e2) { /* mantém "sim" */ }
                    return res.status(409).json({ erro: "Você já respondeu a este convite!", resposta: anterior });
                }
                throw e;
            }

            // avisa o organizador (sininho + push); se falhar, a confirmação continua valendo
            try {
                const donoUid = evento.usuarioId;
                if (donoUid) {
                    await fb.db.collection("avisos").add({
                        tipo: "presenca",
                        uid: donoUid,
                        eventoId,
                        ferramenta: "convidados",
                        mensagem: resposta === "nao"
                            ? `Que pena! ${nome} não poderá comparecer — ${texto(evento.nome, 80)}`
                            : `${nome} confirmou presença — ${texto(evento.nome, 80)}`,
                        lida: false,
                        dataCriacao: fb.FieldValue.serverTimestamp()
                    });

                    if (!(await categoriasDesligadas(fb, donoUid)).includes("colaboracao")) {
                        await enviarPush(fb, donoUid, {
                            titulo: resposta === "nao" ? "😕 Não poderá comparecer" : "✅ Presença confirmada",
                            corpo: resposta === "nao"
                                ? `Que pena! ${nome} não poderá comparecer — ${texto(evento.nome, 80)}`
                                : `${nome} vai ao evento — ${texto(evento.nome, 80)}`,
                            url: `/convidados.html?id=${encodeURIComponent(eventoId)}`,
                            tag: `presenca-${eventoId}`
                        });
                    }
                }
            } catch (e) {
                console.error("PRESENCA: falha ao avisar o organizador", e.message);
            }

            return res.status(200).json({ ok: true });
        }

        return res.status(400).json({ erro: "Ação inválida." });
    } catch (erro) {
        console.error("PRESENCA: erro", erro.code || "", erro.message);
        return res.status(500).json({ erro: "Não foi possível concluir.", detalhe: String(erro.code || erro.message || "").slice(0, 120) });
    }
}
