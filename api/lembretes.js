// ==========================================================
//  /api/lembretes  -  lembretes por data (rotina diária)
//
//  A Vercel chama esta rotina todo dia de manhã (ver vercel.json).
//  Para cada evento, ela confere prazos, calendário, orçamento e dicas
//  (regras em api/_lembretes.js) e cria avisos na coleção "avisos",
//  que aparecem no sininho. Cada lembrete é criado uma única vez.
//
//  Quem recebe: dono + colaboradores do evento. Quem desligou a categoria
//  em Notificações (usuarios/{uid}.avisosDesligados) não recebe.
//  Limite: no máximo 3 lembretes novos por pessoa por dia.
//
//  Usa a mesma variável CRON_SECRET do /api/agradecer.
// ==========================================================

import { iniciarFirebase } from "./nexus.js";
import { gerarLembretes } from "./_lembretes.js";
import { enviarPush, TITULOS } from "./_push.js";

const FUSO = "America/Sao_Paulo";
const PAGINAS = {
    evento: "evento.html", tarefas: "tarefas.html", calendario: "calendario.html",
    financeiro: "controleFinanceiro.html", presentes: "presentes.html", nexus: "nexus.html"
};

function dataBR(deslocamentoDias = 0) {
    const d = new Date(Date.now() + deslocamentoDias * 86400000);
    return d.toLocaleDateString("en-CA", { timeZone: FUSO });
}

function idSeguro(t) {
    return String(t).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 200);
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    const segredo = process.env.CRON_SECRET;

    if (!segredo || req.headers.authorization !== `Bearer ${segredo}`) {
        return res.status(401).json({ erro: "Não autorizado." });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return res.status(500).json({ erro: "Servidor não configurado." });
    }

    const fb = await iniciarFirebase();
    const hoje = dataBR(0);
    const hojeTag = hoje;

    // eventos de até 30 dias atrás em diante (tarefas atrasadas ainda interessam)
    const eventos = await fb.db.collection("eventos")
        .where("data", ">=", dataBR(-30))
        .limit(500)
        .get();

    const porPessoa = new Map();   // uid -> [{ ...lembrete, eventoId, eventoNome }]
    const preferencias = new Map();

    async function desligadas(uid) {
        if (!preferencias.has(uid)) {
            const snap = await fb.db.collection("usuarios").doc(uid).get();
            const lista = snap.exists && Array.isArray(snap.data().avisosDesligados) ? snap.data().avisosDesligados : [];
            preferencias.set(uid, lista);
        }
        return preferencias.get(uid);
    }

    for (const docEvento of eventos.docs) {
        try {
            const evento = docEvento.data();
            if (evento.arquivado === true) continue;   // arquivado: sem lembretes
            const ref = docEvento.ref;

            const [tarefas, calendario, financeiro, presentes, membros] = await Promise.all([
                ref.collection("tarefas").get(),
                ref.collection("calendario").get(),
                ref.collection("controleFinanceiro").get(),
                ref.collection("presentes").limit(1).get(),
                ref.collection("membros").get()
            ]);

            const lembretes = gerarLembretes({
                hoje,
                evento,
                tarefas: tarefas.docs.map((d) => ({ id: d.id, ...d.data() })),
                calendario: calendario.docs.map((d) => ({ id: d.id, ...d.data() })),
                financeiro: financeiro.docs.map((d) => d.data()),
                qtdPresentes: presentes.size
            });

            if (!lembretes.length) continue;

            const destinatarios = new Set();
            if (evento.usuarioId) destinatarios.add(evento.usuarioId);
            membros.forEach((m) => { if (m.data().papel === "colaborador") destinatarios.add(m.id); });

            for (const uid of destinatarios) {
                const off = await desligadas(uid);
                const lista = porPessoa.get(uid) || [];

                for (const l of lembretes) {
                    if (off.includes(l.categoria)) continue;
                    lista.push({ ...l, eventoId: docEvento.id, eventoNome: evento.nome || "" });
                }

                porPessoa.set(uid, lista);
            }
        } catch (erro) {
            console.error("LEMBRETES: falha no evento", docEvento.id, erro.message);
        }
    }

    let criados = 0;
    let pushes = 0;

    for (const [uid, lista] of porPessoa) {
        // cria só os que ainda não existem, e respeita o limite diário
        const novos = [];

        for (const l of [...lista].sort((a, b) => a.prioridade - b.prioridade)) {
            const id = idSeguro(`lembrete__${uid}__${l.eventoId}__${l.chave}`);
            const ref = fb.db.collection("avisos").doc(id);
            const existe = (await ref.get()).exists;
            if (!existe) novos.push({ ref, l });
            if (novos.length >= 3) break;
        }

        const criadosAgora = [];

        for (const { ref, l } of novos) {
            try {
                await ref.create({
                    tipo: "lembrete",
                    categoria: l.categoria,
                    uid,
                    eventoId: l.eventoId,
                    ferramenta: l.ferramenta,
                    mensagem: l.mensagem,
                    lida: false,
                    dataCriacao: fb.FieldValue.serverTimestamp()
                });
                criados++;
                criadosAgora.push(l);
            } catch (erro) {
                if (!/ALREADY_EXISTS|already exists/i.test(String(erro.message))) {
                    console.error("LEMBRETES: falha ao criar aviso", erro.message);
                }
            }
        }

        // um único push por pessoa: o lembrete mais importante, ou um resumo
        if (criadosAgora.length) {
            const primeiro = criadosAgora[0];
            const enviados = await enviarPush(fb, uid, {
                titulo: criadosAgora.length === 1 || criadosAgora.every((x) => x.categoria === primeiro.categoria)
                    ? (TITULOS[primeiro.categoria] || "Plannexus")
                    : "🔔 " + criadosAgora.length + " lembretes dos seus eventos",
                corpo: criadosAgora.length === 1 ? primeiro.mensagem : primeiro.mensagem + " (e mais " + (criadosAgora.length - 1) + ")",
                url: "/notificacoes.html",
                tag: "lembretes-" + hojeTag
            });
            pushes += enviados;
        }
    }

    return res.status(200).json({ ok: true, eventos: eventos.size, criados, pushes });
}
