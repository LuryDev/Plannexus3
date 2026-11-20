// ==========================================================
//  /api/lista  -  link público da lista de presentes
//
//  Quem recebe o link NÃO precisa de conta. Por isso a página pública não
//  fala direto com o Firestore: ela chama esta rota, que confere tudo.
//
//  Com login (dono ou colaborador do evento):
//    { acao: "estado",     eventoId }   -> { ativo, token }
//    { acao: "criar",      eventoId }   -> { token }     (reaproveita o link ativo)
//    { acao: "desativar",  eventoId }   -> apaga o link (o link antigo para de funcionar)
//    { acao: "liberar",    eventoId, presenteId } -> tira o nome e deixa o presente livre de novo
//
//    { acao: "pix",        eventoId, pix? }   -> lê (ou salva, se vier "pix") a chave Pix do evento
//    { acao: "pixlista",   eventoId }         -> Pix que os convidados avisaram que enviaram
//    { acao: "pixcomp",    eventoId, avisoId } -> comprovante (imagem) de um desses avisos
//
//  Sem login (convidado):
//    { acao: "ver",      token }                                    -> nome do evento + presentes (+ chave Pix, se ativa)
//    { acao: "pixavisar", token, nome, anonimo, valor, comprovante? } -> "Já enviei meu Pix" (avisa o dono);
//      comprovante = foto/print em JPEG (base64), opcional; só o dono/colaborador consegue ver
//    { acao: "escolher", token, presenteId, nome, anonimo }         -> marca o presente
//
//  O convidado só vê "já escolhido"; o nome de quem vai dar o presente
//  fica só para o dono (campos escolhidoPor / anonimo no presente).
//
//  Os links ficam em listasPublicas/{token}. Essa coleção NÃO tem regra para o
//  app (só este servidor acessa), então ninguém lê os links pelo navegador.
// ==========================================================

import { randomBytes } from "node:crypto";
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

// só links http(s) vão para a página pública
function linkSeguro(url) {
    try {
        const u = new URL(url);
        return (u.protocol === "http:" || u.protocol === "https:") ? u.href : "";
    } catch (e) {
        return "";
    }
}

// ---------- Pix ----------
// O Plannexus NÃO processa pagamento: só mostra a chave do organizador a quem tem o link.
// A chave fica em pixEventos/{eventoId} (coleção sem regra para o app: só este servidor lê).
const TIPOS_PIX = ["CPF", "E-mail", "Telefone", "Aleatória"];

function chavePixValida(tipo, chave) {
    if (tipo === "CPF") return /^\d{11}$/.test(chave.replace(/[.\-\s]/g, ""));
    if (tipo === "E-mail") return chave.length <= 77 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(chave);
    if (tipo === "Telefone") return /^\+?\d{10,14}$/.test(chave.replace(/[()\-\s]/g, ""));
    if (tipo === "Aleatória") return /^[0-9a-fA-F-]{32,36}$/.test(chave);
    return false;
}

function pixLimpo(p) {
    p = p && typeof p === "object" ? p : {};
    const tipo = TIPOS_PIX.includes(p.tipo) ? p.tipo : "";
    const chave = texto(p.chave, 77);
    return { ativo: p.ativo === true, tipo, chave, favorecido: texto(p.favorecido, 60), comprovante: p.comprovante !== false };
}

function milissegundos(ts) {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts._seconds === "number") return ts._seconds * 1000;
    return Number(ts) || 0;
}

async function usuarioDaRequisicao(req, fb) {
    const cabecalho = String(req.headers.authorization || "");
    const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : "";
    return verificarToken(token, fb.projectId);
}

// dono ou colaborador (visitante não gerencia o link)
async function podeGerenciar(fb, eventoId, uid) {
    const eventoRef = fb.db.collection("eventos").doc(eventoId);
    const eventoSnap = await eventoRef.get();
    if (!eventoSnap.exists) return { ok: false, status: 404, erro: "Evento não encontrado." };

    const evento = eventoSnap.data();
    if (evento.usuarioId === uid) return { ok: true, evento };

    const membro = await eventoRef.collection("membros").doc(uid).get();
    if (membro.exists && membro.data().papel === "colaborador") return { ok: true, evento };

    return { ok: false, status: 403, erro: "Sem permissão." };
}

async function linkDoEvento(fb, eventoId) {
    const achado = await fb.db.collection("listasPublicas").where("eventoId", "==", eventoId).limit(1).get();
    return achado.empty ? null : achado.docs[0];
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

        // ================= ÁREA DO DONO =================
        if (["estado", "criar", "desativar", "liberar", "pix", "pixlista", "pixcomp"].includes(acao)) {
            let usuario;
            try {
                usuario = await usuarioDaRequisicao(req, fb);
            } catch (e) {
                return res.status(401).json({ erro: "Sessão inválida." });
            }

            const eventoId = texto(corpo.eventoId, 100);
            if (!eventoId) return res.status(400).json({ erro: "Dados inválidos." });

            const permissao = await podeGerenciar(fb, eventoId, usuario.uid);
            if (!permissao.ok) return res.status(permissao.status).json({ erro: permissao.erro });

            if (acao === "pix") {
                const ref = fb.db.collection("pixEventos").doc(eventoId);
                if (corpo.pix !== undefined) {
                    const novo = pixLimpo(corpo.pix);
                    if (novo.ativo && !chavePixValida(novo.tipo, novo.chave)) {
                        return res.status(400).json({ erro: "Chave inválida para o tipo escolhido." });
                    }
                    if (novo.ativo && novo.favorecido.length < 2) {
                        return res.status(400).json({ erro: "Informe o nome de quem recebe." });
                    }
                    await ref.set({ ...novo, eventoId, donoUid: permissao.evento.usuarioId || usuario.uid, atualizadoEm: fb.FieldValue.serverTimestamp() });
                    return res.status(200).json({ ok: true, pix: novo });
                }
                const atualPix = await ref.get();
                return res.status(200).json({ ok: true, pix: pixLimpo(atualPix.exists ? atualPix.data() : null) });
            }

            if (acao === "pixlista") {
                const snap = await fb.db.collection("pixEventos").doc(eventoId).collection("avisos").orderBy("criadoEm", "desc").limit(200).get();
                const avisos = snap.docs.map((d) => {
                    const a = d.data();
                    return { id: d.id, nome: a.anonimo ? "" : texto(a.nome, 60), anonimo: !!a.anonimo, valor: Number(a.valor) > 0 ? Number(a.valor) : 0, quando: milissegundos(a.criadoEm), comprovante: !!a.comprovante };
                });
                return res.status(200).json({ ok: true, avisos, total: avisos.reduce((t, a) => t + a.valor, 0) });
            }

            if (acao === "pixcomp") {
                const avisoId = texto(corpo.avisoId, 40);
                if (!/^[A-Za-z0-9]{10,40}$/.test(avisoId)) return res.status(400).json({ erro: "Aviso inválido." });
                const aviso = await fb.db.collection("pixEventos").doc(eventoId).collection("avisos").doc(avisoId).get();
                if (!aviso.exists || !aviso.data().comprovante) return res.status(404).json({ erro: "Comprovante não encontrado." });
                return res.status(200).json({ ok: true, imagem: "data:image/jpeg;base64," + aviso.data().comprovante });
            }

            if (acao === "liberar") {
                const presenteId = texto(corpo.presenteId, 100);
                if (!presenteId) return res.status(400).json({ erro: "Presente inválido." });

                const ref = fb.db.collection("eventos").doc(eventoId).collection("presentes").doc(presenteId);
                if (!(await ref.get()).exists) return res.status(404).json({ erro: "Presente não encontrado." });

                await ref.update({
                    escolhido: fb.FieldValue.delete(),
                    anonimo: fb.FieldValue.delete(),
                    escolhidoPor: fb.FieldValue.delete(),
                    escolhidoEm: fb.FieldValue.delete()
                });
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
            await fb.db.collection("listasPublicas").doc(token).set({
                eventoId,
                donoUid: permissao.evento.usuarioId || usuario.uid,
                criadoEm: fb.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ ok: true, ativo: true, token });
        }

        // ================= ÁREA PÚBLICA =================
        const token = corpo.token;
        if (!tokenValido(token)) return res.status(404).json({ erro: "Link inválido ou desativado." });

        const linkSnap = await fb.db.collection("listasPublicas").doc(token).get();
        if (!linkSnap.exists) return res.status(404).json({ erro: "Link inválido ou desativado." });

        const eventoId = linkSnap.data().eventoId;
        const eventoRef = fb.db.collection("eventos").doc(eventoId);
        const eventoSnap = await eventoRef.get();
        if (!eventoSnap.exists) return res.status(404).json({ erro: "Esta lista não existe mais." });

        const evento = eventoSnap.data();

        if (acao === "ver") {
            const snap = await eventoRef.collection("presentes").get();

            const presentes = snap.docs.map((d) => {
                const p = d.data();
                return {
                    id: d.id,
                    nome: texto(p.nome, 80),
                    observacao: texto(p.observacao, 200),
                    valor: Number(p.valor) > 0 ? Number(p.valor) : 0,
                    link: p.link ? linkSeguro(p.link) : "",
                    escolhido: !!p.escolhido
                };
            }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

            let pix = null;
            const pixSnap = await fb.db.collection("pixEventos").doc(eventoId).get();
            if (pixSnap.exists && pixSnap.data().ativo) {
                const x = pixLimpo(pixSnap.data());
                pix = { tipo: x.tipo, chave: x.chave, favorecido: x.favorecido, comprovante: x.comprovante };
            }

            return res.status(200).json({ ok: true, evento: texto(evento.nome, 120), presentes, pix });
        }

        if (acao === "pixavisar") {
            // campo-isca contra robôs
            if (corpo.armadilha) return res.status(200).json({ ok: true });

            const anonimo = corpo.anonimo === true;
            const nome = texto(corpo.nome, 60);
            const valor = corpo.valor == null || corpo.valor === "" ? 0 : Math.round(Number(corpo.valor) * 100) / 100;

            if (!anonimo && nome.length < 2) return res.status(400).json({ erro: "Digite seu nome (ou marque como anônimo)." });
            if (!(valor >= 0) || valor > 100000) return res.status(400).json({ erro: "Valor inválido." });

            const pixRef = fb.db.collection("pixEventos").doc(eventoId);
            const pixSnap = await pixRef.get();
            if (!pixSnap.exists || !pixSnap.data().ativo) return res.status(400).json({ erro: "A Transferência Instantânea não está ativa neste evento." });

            // limite de segurança: evita encher o banco de avisos falsos
            const quantos = (await pixRef.collection("avisos").count().get()).data().count;
            if (quantos >= 300) return res.status(429).json({ erro: "Muitos avisos neste evento. Fale com o organizador." });

            // comprovante opcional: só JPEG (o navegador já reduz a foto), até ~400 KB, só o dono vê
            let comprovante = "";
            if (corpo.comprovante) {
                if (pixSnap.data().comprovante === false) return res.status(400).json({ erro: "Este evento não aceita comprovante." });
                const b64 = String(corpo.comprovante);
                if (b64.length > 560000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return res.status(400).json({ erro: "Comprovante inválido ou grande demais." });
                const bytes = Buffer.from(b64, "base64");
                if (bytes.length > 420000 || !(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)) {
                    return res.status(400).json({ erro: "Envie o comprovante como foto ou print (imagem)." });
                }
                comprovante = b64;
            }

            await pixRef.collection("avisos").add({ nome: anonimo ? "" : nome, anonimo, valor: valor > 0 ? valor : 0, comprovante, criadoEm: fb.FieldValue.serverTimestamp() });

            try {
                const donoUid = evento.usuarioId;
                if (donoUid) {
                    const quem = anonimo ? "Alguém (anônimo)" : nome;
                    const quanto = valor > 0 ? " de " + valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
                    await fb.db.collection("avisos").add({
                        tipo: "pix",
                        uid: donoUid,
                        eventoId,
                        ferramenta: "presentes",
                        mensagem: `${quem} avisou que fez uma Transferência Instantânea${quanto} — ${texto(evento.nome, 80)}`,
                        lida: false,
                        dataCriacao: fb.FieldValue.serverTimestamp()
                    });

                    if (!(await categoriasDesligadas(fb, donoUid)).includes("colaboracao")) {
                        await enviarPush(fb, donoUid, {
                            titulo: "💸 Transferência Instantânea",
                            corpo: `${quem} avisou que transferiu${quanto} direto para você. Confira no seu banco — ${texto(evento.nome, 80)}`,
                            url: `/presentes.html?id=${encodeURIComponent(eventoId)}`,
                            tag: `pix-${eventoId}`
                        });
                    }
                }
            } catch (e) {
                console.error("LISTA: falha ao avisar o dono do Pix", e.message);
            }

            return res.status(200).json({ ok: true });
        }

        if (acao === "escolher") {
            const presenteId = texto(corpo.presenteId, 100);
            const anonimo = corpo.anonimo === true;
            const nome = texto(corpo.nome, 60);

            if (!presenteId) return res.status(400).json({ erro: "Presente inválido." });
            if (!anonimo && nome.length < 2) return res.status(400).json({ erro: "Digite seu nome (ou marque como anônimo)." });

            const presenteRef = eventoRef.collection("presentes").doc(presenteId);

            // transação: se duas pessoas clicarem juntas, só a primeira consegue
            const resultado = await fb.db.runTransaction(async (t) => {
                const snap = await t.get(presenteRef);
                if (!snap.exists) return { erro: "Esse presente não está mais na lista.", status: 404 };
                if (snap.data().escolhido) return { erro: "Esse presente já foi escolhido por outra pessoa.", status: 409 };

                t.update(presenteRef, {
                    escolhido: true,
                    anonimo,
                    escolhidoPor: anonimo ? "" : nome,
                    escolhidoEm: fb.FieldValue.serverTimestamp()
                });
                return { nome: texto(snap.data().nome, 80) };
            });

            if (resultado.erro) return res.status(resultado.status).json({ erro: resultado.erro });

            // avisa o dono (sininho + push); se falhar, a escolha continua valendo
            try {
                const donoUid = evento.usuarioId;
                if (donoUid) {
                    const quem = anonimo ? "Alguém (anônimo)" : nome;
                    await fb.db.collection("avisos").add({
                        tipo: "presente",
                        uid: donoUid,
                        eventoId,
                        ferramenta: "presentes",
                        mensagem: `${quem} vai dar o presente "${resultado.nome}" — ${texto(evento.nome, 80)}`,
                        lida: false,
                        dataCriacao: fb.FieldValue.serverTimestamp()
                    });

                    if (!(await categoriasDesligadas(fb, donoUid)).includes("colaboracao")) {
                        await enviarPush(fb, donoUid, {
                            titulo: "🎁 Presente escolhido",
                            corpo: `${quem} vai dar "${resultado.nome}" — ${texto(evento.nome, 80)}`,
                            url: `/presentes.html?id=${encodeURIComponent(eventoId)}`,
                            tag: `presente-${eventoId}`
                        });
                    }
                }
            } catch (e) {
                console.error("LISTA: falha ao avisar o dono", e.message);
            }

            return res.status(200).json({ ok: true });
        }

        return res.status(400).json({ erro: "Ação inválida." });
    } catch (erro) {
        console.error("LISTA: erro", erro.code || "", erro.message);
        return res.status(500).json({ erro: "Não foi possível concluir.", detalhe: String(erro.code || erro.message || "").slice(0, 120) });
    }
}
