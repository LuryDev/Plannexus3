// ==========================================================
//  Atualização em tempo real (sem recarregar a página)
//
//  Antes: depois de cada ação o app buscava a lista inteira de novo e o que
//  outras pessoas faziam só aparecia ao reabrir a tela.
//  Agora: cada tela "assiste" a sua coleção do Firestore (onSnapshot).
//   - Uma ação sua aparece NA HORA (o Firestore avisa localmente antes mesmo
//     do servidor confirmar; se o servidor recusar, a tela volta sozinha).
//   - O que colaboradores fazem chega sozinho.
//   - Só o que mudou é lido do banco (mais barato que buscar tudo de novo).
//
//  assistir(chave, consulta, aoMudar)
//     Começa a assistir "consulta" uma única vez por "chave". Chamar de novo
//     com a mesma chave não busca nada: devolve a mesma promessa. Por isso as
//     telas continuam podendo chamar "carregarX()" depois de uma ação sem
//     custo nenhum.
//     aoMudar(snap) recebe o snapshot (use snap.docs). Datas pendentes do
//     servidor (serverTimestamp) já vêm estimadas em d.data({serverTimestamps:"estimate"}).
//
//  atualizarPeriodicamente(funcao, ms)
//     Para telas que falam com a API (e não direto com o Firestore): repete a
//     função enquanto a tela está aberta e visível, e também ao voltar para o
//     app. Nunca roda duas vezes ao mesmo tempo.
//
//  naoRedesenharDigitando(elemento, desenhar)
//     Se a pessoa está digitando dentro de "elemento", adia o redesenho para
//     não apagar o que ela escreveu.
// ==========================================================

import { onSnapshot } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const ouvintes = new Map();

export function dadosDe(documento) {
    return documento.data({ serverTimestamps: "estimate" });
}

export function assistir(chave, consulta, aoMudar) {
    if (ouvintes.has(chave)) return ouvintes.get(chave).pronto;

    let primeira = true;
    let resolver, rejeitar;
    const pronto = new Promise((ok, nao) => { resolver = ok; rejeitar = nao; });

    const parar = onSnapshot(
        consulta,
        (snap) => {
            let r = null;
            try {
                r = aoMudar(snap);
            } catch (erro) {
                console.error("Tempo real:", erro);
            }

            const terminou = r && typeof r.then === "function"
                ? r.catch((e) => console.error("Tempo real:", e))
                : Promise.resolve();

            // a promessa só resolve depois do primeiro desenho (mesmo quando aoMudar é assíncrono)
            if (primeira) { primeira = false; terminou.then(resolver); }
        },
        (erro) => {
            if (primeira) { primeira = false; ouvintes.delete(chave); rejeitar(erro); }
            else console.warn("Tempo real interrompido:", erro && erro.message);
        }
    );

    ouvintes.set(chave, { pronto, parar });
    window.addEventListener("pagehide", () => { try { parar(); } catch (e) { /* ok */ } }, { once: true });
    return pronto;
}

// ---------- telas que usam a API ----------
export function atualizarPeriodicamente(funcao, ms = 20000) {
    let rodando = false;
    let timer = null;

    async function tick() {
        if (rodando || document.hidden) return;
        rodando = true;
        try { await funcao(); } catch (e) { console.warn("Atualização automática:", e && e.message); }
        rodando = false;
    }

    function ligar() {
        if (timer) return;
        timer = setInterval(tick, ms);
    }
    function desligar() {
        clearInterval(timer);
        timer = null;
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) desligar();
        else { tick(); ligar(); }
    });
    window.addEventListener("pageshow", (e) => { if (e.persisted) tick(); });
    ligar();
    return { agora: tick, parar: desligar };
}

// ---------- não apagar o que a pessoa está digitando ----------
export function naoRedesenharDigitando(elemento, desenhar) {
    const ativo = document.activeElement;
    const digitando = ativo && elemento && elemento.contains(ativo) &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) && String(ativo.value || "").length > 0;

    if (!digitando) { desenhar(); return; }

    // tenta de novo quando a pessoa sair do campo
    ativo.addEventListener("blur", () => setTimeout(() => desenhar(), 150), { once: true });
}
