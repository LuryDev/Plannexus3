// ==========================================================
//  /api/anexos  -  documentos do evento (PDF, Word, Excel)
//
//  Com login (dono/colaborador):
//    { acao: "listar",  eventoId }                         -> { anexos: [{id, nome, tamanho, quando}] }
//    { acao: "enviar",  eventoId, nome, base64 }           -> envia um arquivo (até 2 MB, 10 por evento)
//    { acao: "remover", eventoId, id }
//    { acao: "baixar",  eventoId, id }                     -> { nome, base64 }
//  Com login (qualquer pessoa do evento): "listar" e "baixar"
//
//  Os arquivos ficam em coleções SEM regra para o app (só este servidor lê/escreve):
//    anexos/{id}                -> { eventoId, nome, tamanho, partes, criadoEm }
//    anexos/{id}/partes/{n}     -> { dados }   (pedaços do arquivo em base64)
// ==========================================================

import { iniciarFirebase, verificarToken } from "./nexus.js";
import { limitesDoUsuario } from "./_plano.js";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ARQUIVOS = 10;
const PEDACO = 700 * 1024;   // caracteres base64 por documento (limite do Firestore é 1 MB)
const EXTENSOES = ["pdf", "doc", "docx", "xls", "xlsx"];
const TIPOS = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function texto(v, max) {
    return String(v == null ? "" : v).trim().slice(0, max);
}

function nomeLimpo(nome) {
    return texto(nome, 80).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
}

function extensaoDe(nome) {
    const m = /\.([A-Za-z0-9]{2,5})$/.exec(nome);
    return m ? m[1].toLowerCase() : "";
}

// confere o conteúdo real do arquivo (não só o nome)
export function conteudoCombina(ext, bytes) {
    const inicio = (n) => Array.from(bytes.slice(0, n));
    if (ext === "pdf") return String.fromCharCode.apply(null, inicio(5)) === "%PDF-";
    if (ext === "docx" || ext === "xlsx") { const b = inicio(4); return b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4; }
    if (ext === "doc" || ext === "xls") { const b = inicio(4); return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0; }
    return false;
}

async function permissao(fb, eventoId, uid, soGestor) {
    const eventoRef = fb.db.collection("eventos").doc(eventoId);
    const snap = await eventoRef.get();
    if (!snap.exists) return { ok: false, status: 404, erro: "Evento não encontrado." };
    const evento = snap.data();
    if (evento.usuarioId === uid) return { ok: true, evento, gestor: true };
    const membro = await eventoRef.collection("membros").doc(uid).get();
    if (membro.exists) {
        const gestor = membro.data().papel === "colaborador";
        if (gestor || !soGestor) return { ok: true, evento, gestor };
    }
    return { ok: false, status: 403, erro: "Sem permissão." };
}

function resumo(d) {
    const x = d.data();
    return {
        id: d.id, nome: x.nome, tamanho: x.tamanho || 0,
        quando: x.criadoEm && x.criadoEm.toMillis ? x.criadoEm.toMillis() : 0
    };
}

async function doEvento(fb, eventoId) {
    const snap = await fb.db.collection("anexos").where("eventoId", "==", eventoId).get();
    return snap.docs.sort((a, b) => (resumo(a).quando - resumo(b).quando));
}

async function lerArquivo(fb, doc) {
    const x = doc.data();
    let base64 = "";
    for (let i = 0; i < (x.partes || 0); i++) {
        const p = await fb.db.collection("anexos").doc(doc.id).collection("partes").doc(String(i)).get();
        base64 += p.exists ? p.data().dados : "";
    }
    return { nome: x.nome, base64, tipo: TIPOS[extensaoDe(x.nome)] || "application/octet-stream" };
}

async function apagar(fb, doc) {
    const x = doc.data();
    for (let i = 0; i < (x.partes || 0); i++) {
        await fb.db.collection("anexos").doc(doc.id).collection("partes").doc(String(i)).delete();
    }
    await doc.ref.delete();
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) return res.status(500).json({ erro: "Servidor não configurado." });

    let corpo;
    try {
        corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    } catch (e) {
        return res.status(400).json({ erro: "Pedido inválido." });
    }

    try {
        const fb = await iniciarFirebase();
        const acao = texto(corpo.acao, 20);

        // ---------- organizador / membros (com login) ----------
        if (!["listar", "enviar", "remover", "baixar"].includes(acao)) {
            return res.status(400).json({ erro: "Ação inválida." });
        }
        let usuario;
        try {
            const cab = String(req.headers.authorization || "");
            usuario = await verificarToken(cab.startsWith("Bearer ") ? cab.slice(7) : "", fb.projectId);
        } catch (e) {
            return res.status(401).json({ erro: "Sessão inválida." });
        }
        const eventoId = texto(corpo.eventoId, 100);
        if (!eventoId) return res.status(400).json({ erro: "Dados inválidos." });
        const perm = await permissao(fb, eventoId, usuario.uid, !["listar", "baixar"].includes(acao));
        if (!perm.ok) return res.status(perm.status).json({ erro: perm.erro });

        const todos = await doEvento(fb, eventoId);

        if (acao === "listar") {
            return res.status(200).json({ ok: true, gestor: !!perm.gestor, anexos: todos.map(resumo) });
        }

        if (acao === "enviar") {
            const nome = nomeLimpo(corpo.nome);
            const ext = extensaoDe(nome);
            if (!EXTENSOES.includes(ext)) return res.status(400).json({ erro: "Envie um arquivo PDF, Word (.doc/.docx) ou Excel (.xls/.xlsx)." });
            // o limite segue o plano do DONO do evento (quem paga é o organizador)
            const plano = await limitesDoUsuario(fb.db, perm.evento.usuarioId);
            const maxArquivos = Math.min(MAX_ARQUIVOS, plano.anexosPorEvento);
            if (todos.length >= maxArquivos) {
                return res.status(400).json({ erro: plano.tipo === "gratis"
                    ? "O plano gratuito permite " + maxArquivos + " arquivos por evento. Apague um para enviar outro (os planos pagos permitem " + MAX_ARQUIVOS + ")."
                    : "Limite de " + maxArquivos + " arquivos por evento." });
            }
            const base64 = String(corpo.base64 || "").replace(/^data:[^,]*,/, "");
            if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return res.status(400).json({ erro: "Arquivo inválido." });
            const bytes = Buffer.from(base64, "base64");
            if (bytes.length === 0 || bytes.length > MAX_BYTES) return res.status(400).json({ erro: "O arquivo deve ter até 2 MB." });
            if (!conteudoCombina(ext, bytes)) return res.status(400).json({ erro: "O conteúdo do arquivo não corresponde ao tipo " + ext.toUpperCase() + "." });

            const partes = Math.ceil(base64.length / PEDACO);
            const ref = await fb.db.collection("anexos").add({
                eventoId, nome, tamanho: bytes.length, partes, autorUid: usuario.uid,
                criadoEm: fb.FieldValue.serverTimestamp()
            });
            for (let i = 0; i < partes; i++) {
                await fb.db.collection("anexos").doc(ref.id).collection("partes").doc(String(i)).set({ dados: base64.slice(i * PEDACO, (i + 1) * PEDACO) });
            }
            return res.status(200).json({ ok: true, id: ref.id });
        }

        const alvo = todos.find((d) => d.id === texto(corpo.id, 60));
        if (!alvo) return res.status(404).json({ erro: "Arquivo não encontrado." });

        if (acao === "remover") {
            await apagar(fb, alvo);
            return res.status(200).json({ ok: true });
        }
        return res.status(200).json(Object.assign({ ok: true }, await lerArquivo(fb, alvo)));
    } catch (erro) {
        console.error("ANEXOS: erro", erro);
        return res.status(500).json({ erro: "Não foi possível concluir. Tente de novo." });
    }
}
