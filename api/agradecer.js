// ==========================================================
//  /api/agradecer  -  e-mail de agradecimento (rotina diária)
//
//  A Vercel chama esta rotina todo dia (ver vercel.json). Ela procura
//  os feedbacks com status "resolvido", envia o e-mail de agradecimento
//  assinado pelo Nexus e muda o status para "agradecido".
//
//  Variável extra: CRON_SECRET (qualquer texto longo; a Vercel o envia
//  no cabeçalho Authorization ao chamar a rotina).
// ==========================================================

import { iniciarFirebase } from "./nexus.js";
import { emailConfigurado, enviarEmail, montarAgradecimento } from "./_email.js";

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    const segredo = process.env.CRON_SECRET;

    if (!segredo || req.headers.authorization !== `Bearer ${segredo}`) {
        return res.status(401).json({ erro: "Não autorizado." });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT || !emailConfigurado()) {
        return res.status(500).json({ erro: "Servidor não configurado." });
    }

    const fb = await iniciarFirebase();

    const lista = await fb.db.collection("feedbacks")
        .where("status", "==", "resolvido")
        .limit(25)
        .get();

    let enviados = 0;
    let falhas = 0;

    for (const doc of lista.docs) {
        const d = doc.data();

        if (d.agradecimentoEnviadoEm || !d.emailContato) continue;

        try {
            await enviarEmail(d.emailContato, montarAgradecimento({ nome: d.nome, assunto: d.assunto }));

            await doc.ref.set({
                status: "agradecido",
                agradecimentoEnviadoEm: fb.FieldValue.serverTimestamp()
            }, { merge: true });

            // também avisa dentro do app (sininho)
            if (d.uid) {
                await fb.db.collection("avisos").doc("feedback__" + doc.id).set({
                    tipo: "feedback",
                    uid: d.uid,
                    mensagem: "Obrigado pelo seu feedback! O problema que você apontou foi resolvido e já enviamos um e-mail de agradecimento. — Nexus",
                    lida: false,
                    dataCriacao: fb.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            enviados++;
        } catch (erro) {
            falhas++;
            console.error("AGRADECER: falha no feedback", doc.id, erro.message);
        }
    }

    return res.status(200).json({ ok: true, enviados, falhas });
}
