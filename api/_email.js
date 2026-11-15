// ==========================================================
//  Envio dos e-mails assinados pelo "Nexus" (via Gmail SMTP)
//  Arquivo auxiliar: o "_" no nome impede que a Vercel o
//  trate como uma rota.
//
//  Variáveis de ambiente (Vercel > Settings > Environment Variables):
//   GMAIL_USER          e-mail que envia (ex.: plannexus.2026@gmail.com)
//   GMAIL_APP_PASSWORD  "senha de app" de 16 letras do Google
// ==========================================================

import nodemailer from "nodemailer";

export function emailConfigurado() {
    return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function escaparHtml(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function primeiroNome(nome) {
    const n = String(nome || "").trim().split(/\s+/)[0];
    return n || "";
}

function saudacao(nome) {
    const n = primeiroNome(nome);
    return n ? `Olá, ${n}!` : "Olá!";
}

function moldura(titulo, paragrafos, assinatura = ["Nexus", "Assistente do Plannexus"]) {
    const corpo = paragrafos
        .map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`)
        .join("");

    return `<div style="font-family:Arial,Helvetica,sans-serif;color:#222;max-width:560px;margin:auto;padding:20px">
<h2 style="margin:0 0 16px">${escaparHtml(titulo)}</h2>${corpo}
<p style="margin:24px 0 0;line-height:1.5"><strong>${escaparHtml(assinatura[0])}</strong><br>${escaparHtml(assinatura[1])}</p>
</div>`;
}

// 1) resposta automática assim que o feedback chega
export function montarRespostaRecebido({ nome, assunto }) {
    const ass = escaparHtml(assunto);

    return {
        assunto: "Recebemos o seu feedback no Plannexus",
        texto:
            `${saudacao(nome)}\n\n` +
            `Aqui é o Nexus, o assistente do Plannexus. Recebemos o seu feedback "${assunto}" e já avisamos a nossa equipe.\n\n` +
            `Vamos analisar com carinho e, quando o ponto for resolvido, enviamos outro e-mail para você.\n\n` +
            `Obrigado por ajudar a melhorar o Plannexus!\n\nNexus\nAssistente do Plannexus`,
        html: moldura("Recebemos o seu feedback!", [
            escaparHtml(saudacao(nome)),
            `Aqui é o Nexus, o assistente do Plannexus. Recebemos o seu feedback <em>&ldquo;${ass}&rdquo;</em> e já avisamos a nossa equipe.`,
            "Vamos analisar com carinho e, quando o ponto for resolvido, enviamos outro e-mail para você.",
            "Obrigado por ajudar a melhorar o Plannexus!"
        ])
    };
}

// 2) agradecimento quando o problema foi resolvido
export function montarAgradecimento({ nome, assunto }) {
    const ass = escaparHtml(assunto);

    return {
        assunto: "Seu feedback no Plannexus foi resolvido!",
        texto:
            `${saudacao(nome)}\n\n` +
            `Passando para agradecer: graças ao seu feedback "${assunto}", conseguimos resolver o ponto que você encontrou.\n\n` +
            `A correção já está na nova versão do aplicativo. Gostaríamos de convidar você para testar e nos contar se está tudo certo. Se encontrar algo mais, envie pelo app em Perfil > Enviar Feedback.\n\n` +
            `Obrigado por ajudar a deixar o Plannexus melhor!\n\nLuiz Miguel\nGerente de Projeto`,
        html: moldura("Seu feedback foi resolvido!", [
            escaparHtml(saudacao(nome)),
            `Passando para agradecer: graças ao seu feedback <em>&ldquo;${ass}&rdquo;</em>, conseguimos resolver o ponto que você encontrou.`,
            "A correção já está na nova versão do aplicativo. Gostaríamos de convidar você para testar e nos contar se está tudo certo. Se encontrar algo mais, envie pelo app em <strong>Perfil &gt; Enviar Feedback</strong>.",
            "Obrigado por ajudar a deixar o Plannexus melhor!"
        ], ["Luiz Miguel", "Gerente de Projeto"])
    };
}

export async function enviarEmail(para, mensagem) {
    const transporte = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_USER,
            pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, "")
        }
    });

    await transporte.sendMail({
        from: { name: "Nexus | Plannexus", address: process.env.GMAIL_USER },
        to: para,
        subject: mensagem.assunto,
        text: mensagem.texto,
        html: mensagem.html
    });
}
