// ==========================================================
//  Envio de notificações push (Firebase Cloud Messaging)
//  Usado por /api/push (ações no app) e /api/lembretes (rotina diária).
//
//  Os aparelhos ficam em usuarios/{uid}/tokens/{id}  (gravados pelo app
//  quando o usuário ativa as notificações). Mandamos só "data" e quem
//  desenha a notificação é o service worker (sw.js).
// ==========================================================

// título da notificação para cada tipo (o emoji ajuda a reconhecer de longe)
export const TITULOS = {
    colaboracao: "👥 Atividade no evento",
    convite:     "✉️ Convite para colaborar",
    aceitou:     "✅ Convite aceito",
    papel:       "🔑 Seu cargo mudou",
    contagem:    "⏳ Seu evento está chegando",
    tarefas:     "📝 Prazo de tarefa",
    calendario:  "📅 Compromisso",
    orcamento:   "💰 Orçamento",
    dicas:       "💡 Dica do Nexus"
};

// categorias que o usuário desligou em Notificações
export async function categoriasDesligadas(fb, uid) {
    const snap = await fb.db.collection("usuarios").doc(uid).get();
    const lista = snap.exists ? snap.data().avisosDesligados : null;
    return Array.isArray(lista) ? lista : [];
}

// devolve quantos aparelhos receberam
export async function enviarPush(fb, uid, { titulo, corpo, url, tag }) {
    try {
        const tokensSnap = await fb.db.collection("usuarios").doc(uid).collection("tokens").get();
        if (tokensSnap.empty) return 0;

        const { getMessaging } = await import("firebase-admin/messaging");

        const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
        if (!tokens.length) return 0;

        const resposta = await getMessaging().sendEachForMulticast({
            tokens,
            data: {
                titulo: String(titulo || "Plannexus").slice(0, 80),
                corpo: String(corpo || "").slice(0, 200),
                url: String(url || "/notificacoes.html"),
                tag: String(tag || "")
            },
            webpush: { headers: { Urgency: "high", TTL: "86400" } }
        });

        // apaga aparelhos que não existem mais
        const apagar = [];
        resposta.responses.forEach((r, i) => {
            const codigo = r.error && r.error.code;
            if (codigo === "messaging/registration-token-not-registered" ||
                codigo === "messaging/invalid-registration-token") {
                apagar.push(tokensSnap.docs[i].ref.delete());
            }
        });
        await Promise.all(apagar);

        return resposta.successCount;
    } catch (erro) {
        console.error("PUSH: falha ao enviar para", uid, erro.message);
        return 0;
    }
}
