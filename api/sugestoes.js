// ==========================================================
//  /api/sugestoes  -  quadro de sugestões dos usuários
//
//  Com login:
//    { acao: "listar" }                       -> { sugestoes: [{id, titulo, descricao, status, votos, votei, minha}] }
//    { acao: "criar", titulo, descricao }     -> nova sugestão (status "recebido")
//    { acao: "votar", id }                    -> liga/desliga o voto do usuário
//
//  Para mudar o andamento: no Firestore, em sugestoes/{id}, troque o campo
//  "status" para  recebido | andamento | lancado.
//
//  Coleção SEM regra para o app (só este servidor acessa):
//    sugestoes/{id} -> { titulo, descricao, status, votantes: [uid], autorUid, criadoEm }
// ==========================================================

import { iniciarFirebase, verificarToken } from "./nexus.js";

const STATUS = ["recebido", "andamento", "lancado"];
const MAX_POR_USUARIO = 5;      // sugestões ainda "recebido" por pessoa
const MAX_LISTA = 100;

function texto(v, max) {
    return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, max);
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
        let usuario;
        try {
            const cab = String(req.headers.authorization || "");
            usuario = await verificarToken(cab.startsWith("Bearer ") ? cab.slice(7) : "", fb.projectId);
        } catch (e) {
            return res.status(401).json({ erro: "Faça login." });
        }
        const acao = texto(corpo.acao, 20);
        const col = fb.db.collection("sugestoes");

        if (acao === "listar") {
            const snap = await col.get();
            const ordem = { andamento: 0, recebido: 1, lancado: 2 };
            const lista = snap.docs.map((d) => {
                const x = d.data();
                const votantes = Array.isArray(x.votantes) ? x.votantes : [];
                return {
                    id: d.id, titulo: texto(x.titulo, 80), descricao: texto(x.descricao, 300),
                    status: STATUS.includes(x.status) ? x.status : "recebido",
                    votos: votantes.length, votei: votantes.includes(usuario.uid), minha: x.autorUid === usuario.uid
                };
            }).sort((a, b) => (ordem[a.status] - ordem[b.status]) || (b.votos - a.votos)).slice(0, MAX_LISTA);
            return res.status(200).json({ ok: true, sugestoes: lista });
        }

        if (acao === "criar") {
            const titulo = texto(corpo.titulo, 80);
            const descricao = texto(corpo.descricao, 300);
            if (titulo.length < 4) return res.status(400).json({ erro: "Escreva um título com pelo menos 4 letras." });
            const todas = await col.where("autorUid", "==", usuario.uid).get();
            if (todas.docs.filter((d) => (d.data().status || "recebido") === "recebido").length >= MAX_POR_USUARIO) {
                return res.status(429).json({ erro: "Você já tem " + MAX_POR_USUARIO + " sugestões aguardando. Espere o andamento antes de enviar mais." });
            }
            const ref = await col.add({
                titulo, descricao, status: "recebido", votantes: [usuario.uid], autorUid: usuario.uid,
                criadoEm: fb.FieldValue.serverTimestamp()
            });
            return res.status(200).json({ ok: true, id: ref.id });
        }

        if (acao === "votar") {
            const id = texto(corpo.id, 60);
            if (!id) return res.status(400).json({ erro: "Sugestão inválida." });
            const ref = col.doc(id);
            const snap = await ref.get();
            if (!snap.exists) return res.status(404).json({ erro: "Sugestão não encontrada." });
            const votantes = Array.isArray(snap.data().votantes) ? snap.data().votantes.slice() : [];
            const i = votantes.indexOf(usuario.uid);
            if (i > -1) votantes.splice(i, 1); else votantes.push(usuario.uid);
            await ref.update({ votantes });
            return res.status(200).json({ ok: true, votos: votantes.length, votei: i === -1 });
        }

        return res.status(400).json({ erro: "Ação inválida." });
    } catch (erro) {
        console.error("SUGESTOES: erro", erro);
        return res.status(500).json({ erro: "Não foi possível concluir. Tente de novo." });
    }
}
