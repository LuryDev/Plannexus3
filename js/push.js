// ==========================================================
//  NOTIFICAÇÕES PUSH NO CELULAR  (js/push.js)
//
//  Liga/desliga o recebimento de notificações com o app fechado e
//  avisa o servidor (/api/push) quando uma ação deve notificar outra pessoa.
//
//  Precisa de duas coisas (veja LEIA-ME-push.txt):
//    - VAPID_KEY em js/config.js (Firebase > Configurações > Cloud Messaging)
//    - FIREBASE_SERVICE_ACCOUNT na Vercel (a mesma que o Nexus já usa)
// ==========================================================

import { getApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
    doc, setDoc, getDocs, deleteDoc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

export function pushDisponivel() {
    return "serviceWorker" in navigator && "Notification" in window && "PushManager" in window &&
           typeof window.VAPID_KEY === "string" && window.VAPID_KEY.length > 20;
}

// por que o push não está disponível (para mostrar o motivo certo)
//   "chave"    -> falta a VAPID_KEY em js/config.js
//   "aparelho" -> este navegador/app não tem suporte (app sem Notification delegation, aparelho antigo...)
//   ""         -> disponível
export function motivoIndisponivel() {
    if (!(typeof window.VAPID_KEY === "string" && window.VAPID_KEY.length > 20)) return "chave";
    if (!("serviceWorker" in navigator) || !("Notification" in window) || !("PushManager" in window)) return "aparelho";
    return "";
}

export function pushAtivo() {
    return pushDisponivel() && Notification.permission === "granted" &&
           localStorage.getItem("pushAtivo") === "1";
}

async function obterMensageiro() {
    const { getMessaging, isSupported } = await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js");
    if (!(await isSupported())) throw new Error("Este aparelho não aceita notificações push.");
    return { mensageiro: getMessaging(getApp()), modulo: await import("https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging.js") };
}

// pede permissão, pega o "endereço" do aparelho e guarda no Firestore
export async function ativarPush(db, usuario) {
    if (!pushDisponivel()) throw new Error("As notificações ainda não estão configuradas neste app.");

    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") throw new Error("Permissão negada. Ative as notificações nas configurações do aparelho.");

    const registro = await navigator.serviceWorker.ready;
    const { mensageiro, modulo } = await obterMensageiro();

    const token = await modulo.getToken(mensageiro, {
        vapidKey: window.VAPID_KEY,
        serviceWorkerRegistration: registro
    });

    if (!token) throw new Error("Não foi possível registrar este aparelho.");

    await setDoc(doc(db, "usuarios", usuario.uid, "tokens", token.slice(-40).replace(/[^A-Za-z0-9_-]/g, "_")), {
        token,
        aparelho: String(navigator.userAgent).slice(0, 150),
        criadoEm: serverTimestamp()
    });

    localStorage.setItem("pushAtivo", "1");
}

export async function desativarPush(db, usuario) {
    try {
        const { mensageiro, modulo } = await obterMensageiro();
        await modulo.deleteToken(mensageiro);
    } catch (erro) { /* segue: o importante é apagar do servidor */ }

    const tokens = await getDocs(collection(db, "usuarios", usuario.uid, "tokens"));
    await Promise.all(tokens.docs.map((d) => deleteDoc(d.ref)));

    localStorage.removeItem("pushAtivo");
}

// avisa o servidor para mandar o push (falhar aqui nunca atrapalha o app)
export async function notificarServidor(usuario, dados) {
    try {
        if (!usuario) return;
        const token = await usuario.getIdToken();

        await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(dados),
            keepalive: true
        });
    } catch (erro) {
        console.warn("Push não enviado:", erro);
    }
}
