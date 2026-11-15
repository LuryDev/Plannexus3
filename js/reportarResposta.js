// ==========================================================
//  REPORTAR RESPOSTA DO NEXUS  (js/reportarResposta.js)
//
//  Coloca "Reportar resposta" embaixo de cada resposta da IA (exigido pela
//  política de conteúdo gerado por IA do Google Play). O reporte vira um
//  documento em "feedbacks" com a categoria "Denúncia de resposta do Nexus (IA)",
//  o mesmo lugar dos feedbacks normais.
//
//  Uso:  anexarReporte(balaoDaResposta, { usuario, pergunta, resposta, origem });
//  Estilos: css/nexusFlutuante.css (classes nxf-reportar*).
// ==========================================================

import { getApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const CATEGORIA = "Denúncia de resposta do Nexus (IA)";
const MOTIVOS = ["Ofensiva ou perigosa", "Informação errada", "Outro problema"];

// Monta os campos do documento (separado para ser fácil de testar).
export function montarReporte({ usuario, pergunta, resposta, origem, motivo }) {
    const limitar = (t, n) => String(t || "").trim().slice(0, n);

    return {
        categoria: CATEGORIA,
        assunto: limitar("Motivo: " + motivo, 120),
        mensagem: limitar(
            "Motivo: " + motivo + "\n" +
            "Onde: " + (origem || "chat do Nexus") + "\n\n" +
            "Pergunta do usuário:\n" + limitar(pergunta, 600) + "\n\n" +
            "Resposta do Nexus:\n" + limitar(resposta, 1100),
            2000
        ),
        uid: usuario.uid,
        nome: usuario.displayName || "",
        email: usuario.email || "",
        status: "novo",
        criadoEm: serverTimestamp()
    };
}

export function anexarReporte(balao, contexto) {
    const caixa = document.createElement("div");
    caixa.className = "nxf-reportar";

    const link = document.createElement("button");
    link.type = "button";
    link.className = "nxf-reportar-link";
    link.textContent = "⚑ Reportar resposta";
    caixa.appendChild(link);

    link.addEventListener("click", () => {
        caixa.innerHTML = "";

        const titulo = document.createElement("span");
        titulo.className = "nxf-reportar-texto";
        titulo.textContent = "O que há de errado?";
        caixa.appendChild(titulo);

        MOTIVOS.forEach((motivo) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "nxf-reportar-motivo";
            b.textContent = motivo;
            b.addEventListener("click", () => enviar(motivo));
            caixa.appendChild(b);
        });
    });

    async function enviar(motivo) {
        caixa.textContent = "Enviando...";
        caixa.className = "nxf-reportar nxf-reportar-texto";

        try {
            const db = getFirestore(getApp());
            await addDoc(collection(db, "feedbacks"), montarReporte({ ...contexto, motivo }));
            caixa.textContent = "Obrigado! Recebemos o seu reporte.";
        } catch (erro) {
            console.error("Erro ao reportar resposta:", erro);
            caixa.textContent = "Não foi possível enviar o reporte agora.";
        }
    }

    balao.insertAdjacentElement("afterend", caixa);
    return caixa;
}
