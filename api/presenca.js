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
//    { acao: "regras",    eventoId, regras? }     -> lê (ou salva, se vier "regras") as regras do evento
//  Com login (qualquer pessoa do evento):
//    { acao: "lista",     eventoId }              -> { evento, esperados, confirmados: [{id, nome}] }
//
//  Sem login (convidado):
//    { acao: "ver",       token, dispositivo }    -> dados do evento (+ jaConfirmou)
//    { acao: "confirmar", token, nome, email, dispositivo, criancas, acompanhantes, alimentacao, relacao }
//      -> registra a presença (o servidor confere tudo contra as regras do organizador)
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

// ---------- regras do evento (definidas pelo organizador) ----------
const ALIMENTACAO = ["Vegetariana", "Vegana", "Sem glúten", "Sem lactose"];
const RELACOES = ["Família", "Amigo(a)", "Trabalho", "Outro"];

function limparRegras(r) {
    r = r && typeof r === "object" ? r : {};
    const ac = r.acompanhantes && typeof r.acompanhantes === "object" ? r.acompanhantes : {};
    const soAdultos = r.soAdultos === true;
    return {
        soAdultos,
        criancas: !soAdultos && r.criancas === true,
        acompanhantes: { ativo: ac.ativo === true, max: Math.min(10, Math.max(1, Math.floor(Number(ac.max)) || 2)) },
        alimentacao: ALIMENTACAO.filter((a) => Array.isArray(r.alimentacao) && r.alimentacao.includes(a)),
        parentesco: r.parentesco === true
    };
}

function contagem(v) {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
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

// documento de presença deste aparelho (ou null)
async function presencaDoAparelho(fb, eventoId, dispositivo) {
    if (!dispositivoValido(dispositivo)) return null;
    const achado = await fb.db.collection("presencas")
        .where("eventoId", "==", eventoId)
        .where("dispositivo", "==", hashDoDispositivo(dispositivo))
        .limit(1).get();
    return achado.empty ? null : achado.docs[0];
}

function dataValida(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || "")); }
function horaValida(h) { return /^\d{2}:\d{2}$/.test(String(h || "")); }

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
    if (evento.usuarioId === uid) return { ok: true, evento, gestor: true };

    const membro = await eventoRef.collection("membros").doc(uid).get();
    if (membro.exists && (qualquerMembro || membro.data().papel === "colaborador")) {
        return { ok: true, evento, gestor: membro.data().papel === "colaborador" };
    }

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
        if (["estado", "criar", "desativar", "remover", "lista", "regras", "editar"].includes(acao)) {
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

            if (acao === "regras") {
                const ref = fb.db.collection("eventos").doc(eventoId);
                if (corpo.regras !== undefined) {
                    const limpas = limparRegras(corpo.regras);
                    await ref.update({ regras: limpas });
                    return res.status(200).json({ ok: true, regras: limpas });
                }
                return res.status(200).json({ ok: true, regras: limparRegras(permissao.evento.regras) });
            }

            if (acao === "editar") {
                // altera data/horário/local; com "avisar", os convidados veem o antes/depois
                const ev = permissao.evento;
                const novo = {
                    data: corpo.data === "" ? "" : (dataValida(corpo.data) ? corpo.data : texto(ev.data, 10)),
                    horario: corpo.horario === "" ? "" : (horaValida(corpo.horario) ? corpo.horario : texto(ev.horario, 5)),
                    local: corpo.local === undefined ? texto(ev.local, 120) : texto(corpo.local, 120)
                };
                const antes = { data: texto(ev.data, 10), horario: texto(ev.horario, 5), local: texto(ev.local, 120) };
                const mudou = antes.data !== novo.data || antes.horario !== novo.horario || antes.local !== novo.local;
                const mudanca = Object.assign({}, novo);
                if (mudou && corpo.avisar) {
                    mudanca.atualizacao = { quando: Date.now(), antes, depois: novo };
                }
                await fb.db.collection("eventos").doc(eventoId).update(mudanca);
                return res.status(200).json({ ok: true, mudou, avisou: !!(mudou && corpo.avisar) });
            }

            if (acao === "lista") {
                const snap = await fb.db.collection("presencas").where("eventoId", "==", eventoId).get();
                const todos = snap.docs
                    .map((d) => {
                        const x = d.data();
                        const criancas = contagem(x.criancas);
                        const acompanhantes = contagem(x.acompanhantes);
                        return {
                            id: d.id, nome: texto(x.nome, 60), resposta: respostaDe(x), quando: milissegundos(x.criadoEm),
                            criancas, acompanhantes, pessoas: 1 + criancas + acompanhantes,
                            alimentacao: Array.isArray(x.alimentacao) ? x.alimentacao.filter((a) => ALIMENTACAO.includes(a)) : [],
                            relacao: RELACOES.includes(x.relacao) ? x.relacao : ""
                        };
                    })
                    .sort((a, b) => a.quando - b.quando);
                const sim = todos.filter((x) => x.resposta === "sim");
                // detalhes (crianças, restrições, parentesco) só para dono/colaborador
                const confirmados = sim.map((x) => permissao.gestor
                    ? { id: x.id, nome: x.nome, quando: x.quando, pessoas: x.pessoas, criancas: x.criancas, acompanhantes: x.acompanhantes, alimentacao: x.alimentacao, relacao: x.relacao }
                    : { id: x.id, nome: x.nome, quando: x.quando, pessoas: x.pessoas });
                const ausentes = todos.filter((x) => x.resposta === "nao").map(({ id, nome, quando }) => ({ id, nome, quando }));
                const esperados = Number(permissao.evento.convidados) > 0 ? Number(permissao.evento.convidados) : 0;

                const totais = { pessoas: 0, criancas: 0, adultos: 0, alimentacao: {} };
                sim.forEach((x) => {
                    totais.pessoas += x.pessoas;
                    totais.criancas += x.criancas;
                    x.alimentacao.forEach((a) => { totais.alimentacao[a] = (totais.alimentacao[a] || 0) + 1; });
                });
                totais.adultos = totais.pessoas - totais.criancas;
                if (!permissao.gestor) { totais.criancas = 0; totais.adultos = 0; totais.alimentacao = {}; }

                return res.status(200).json({
                    ok: true,
                    evento: texto(permissao.evento.nome, 120),
                    esperados,
                    gestor: !!permissao.gestor,
                    totais,
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
                    const docAnterior = await presencaDoAparelho(fb, eventoId, corpo.dispositivo);
                    const anterior = docAnterior ? respostaDe(docAnterior.data()) : null;
                    const at = evento.atualizacao && evento.atualizacao.quando ? evento.atualizacao : null;
                    const vista = docAnterior ? Number(docAnterior.data().vistaAtualizacao || 0) : 0;
                    // só mostra o aviso a quem já disse que vai e ainda não respondeu a esta mudança
                    const mostrarAt = !!(at && anterior === "sim" && vista < at.quando);
                    return {
                        jaConfirmou: !!anterior, respostaAnterior: anterior || undefined,
                        atualizacao: mostrarAt ? { antes: at.antes || {}, depois: at.depois || {} } : undefined
                    };
                })()),
                evento: texto(evento.nome, 120),
                data: texto(evento.data, 10),
                horario: texto(evento.horario, 5),
                local: texto(evento.local, 120),
                regras: limparRegras(evento.regras)
            });
        }

        if (acao === "reagir") {
            // convidado que já confirmou responde ao aviso de mudança do evento
            const docP = await presencaDoAparelho(fb, eventoId, corpo.dispositivo);
            const at = evento.atualizacao && evento.atualizacao.quando ? evento.atualizacao : null;
            if (!docP || !at) return res.status(404).json({ erro: "Nada para responder." });
            const dados = docP.data();
            if (respostaDe(dados) !== "sim") return res.status(409).json({ erro: "Você já respondeu." });
            const vai = corpo.resposta !== "nao";
            const mudanca = { vistaAtualizacao: at.quando };
            if (!vai) Object.assign(mudanca, { resposta: "nao", criancas: 0, acompanhantes: 0, alimentacao: [], relacao: "" });
            await docP.ref.update(mudanca);
            try {
                if (!vai && evento.usuarioId) {
                    const msg = `${texto(dados.nome, 60)} não poderá mais ir — ${texto(evento.nome, 80)}`;
                    await fb.db.collection("avisos").add({
                        tipo: "presenca", uid: evento.usuarioId, eventoId, ferramenta: "convidados",
                        mensagem: msg, lida: false, dataCriacao: fb.FieldValue.serverTimestamp()
                    });
                    if (!(await categoriasDesligadas(fb, evento.usuarioId)).includes("colaboracao")) {
                        await enviarPush(fb, evento.usuarioId, {
                            titulo: "😕 Não poderá mais ir", corpo: msg,
                            url: `/convidados.html?id=${encodeURIComponent(eventoId)}`, tag: `presenca-${eventoId}`
                        });
                    }
                }
            } catch (e) { console.error("PRESENCA: falha ao avisar", e.message); }
            return res.status(200).json({ ok: true, resposta: vai ? "sim" : "nao" });
        }

        if (acao === "confirmar") {
            // campo-isca: robôs preenchem, pessoas não veem
            if (corpo.armadilha) return res.status(200).json({ ok: true });

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

            // regras do organizador: o servidor confere (a tela só mostra o que está liberado)
            const regras = limparRegras(evento.regras);
            let criancas = 0, acompanhantes = 0, alimentacao = [], relacao = "";
            if (resposta === "sim") {
                criancas = contagem(corpo.criancas);
                acompanhantes = contagem(corpo.acompanhantes);
                if (criancas > 0 && !regras.criancas) {
                    return res.status(400).json({ erro: regras.soAdultos ? "Este evento é exclusivo para adultos." : "O organizador não liberou crianças neste evento." });
                }
                if (criancas > 10) return res.status(400).json({ erro: "Quantidade de crianças inválida." });
                if (acompanhantes > 0 && !regras.acompanhantes.ativo) {
                    return res.status(400).json({ erro: "O organizador não liberou acompanhantes neste evento." });
                }
                if (acompanhantes > regras.acompanhantes.max) {
                    return res.status(400).json({ erro: "O máximo de acompanhantes é " + regras.acompanhantes.max + "." });
                }
                const pedidas = Array.isArray(corpo.alimentacao) ? corpo.alimentacao.slice(0, 10).map((a) => texto(a, 30)) : [];
                if (pedidas.some((a) => !regras.alimentacao.includes(a))) {
                    return res.status(400).json({ erro: "Essa opção de alimentação não é oferecida neste evento." });
                }
                alimentacao = regras.alimentacao.filter((a) => pedidas.includes(a));
                if (regras.parentesco) relacao = RELACOES.includes(corpo.relacao) ? corpo.relacao : "";
            }

            const ref = fb.db.collection("presencas").doc(eventoId + "_" + hashDoEmail(email));

            try {
                await ref.create({
                    eventoId,
                    nome,
                    resposta,
                    criancas,
                    acompanhantes,
                    alimentacao,
                    relacao,
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
                            : `${nome} confirmou presença${1 + criancas + acompanhantes > 1 ? " (" + (1 + criancas + acompanhantes) + " pessoas)" : ""} — ${texto(evento.nome, 80)}`,
                        lida: false,
                        dataCriacao: fb.FieldValue.serverTimestamp()
                    });

                    if (!(await categoriasDesligadas(fb, donoUid)).includes("colaboracao")) {
                        await enviarPush(fb, donoUid, {
                            titulo: resposta === "nao" ? "😕 Não poderá comparecer" : "✅ Presença confirmada",
                            corpo: resposta === "nao"
                                ? `Que pena! ${nome} não poderá comparecer — ${texto(evento.nome, 80)}`
                                : `${nome} vai ao evento${1 + criancas + acompanhantes > 1 ? " com mais " + (criancas + acompanhantes) : ""} — ${texto(evento.nome, 80)}`,
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
