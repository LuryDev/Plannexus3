// ==========================================================
//  PLANOS (servidor)  -  gratuito x pago
//
//  O plano de cada pessoa fica em usuarios/{uid}:
//     plano:      "passe" | "temporada" | "anual"   (ausente = gratuito)
//     planoAte:   data em que o plano acaba (Timestamp ou texto ISO)
//  Esses campos só podem ser gravados pelo servidor (conta de serviço) -
//  as regras do Firestore devem impedir o próprio usuário de mudá-los.
//
//  Os mesmos números existem em js/planos.js (tela do app). Mudou aqui,
//  mude lá também.
// ==========================================================

// FASE DE TESTES: enquanto for true, o limite de eventos ativos NÃO é aplicado
// (todo mundo cria quantos eventos quiser). Com false, vale o limite de 3 do gratuito.
// Se mudar aqui, mude igual em js/planos.js.
export const FASE_DE_TESTES = false;

export const LIMITES = {
    gratis: { eventosAtivos: FASE_DE_TESTES ? Infinity : 3, nexusPorMes: 40,  anexosPorEvento: 3 },
    pago:   { eventosAtivos: Infinity, nexusPorMes: 600, anexosPorEvento: 10 }   // 600 = teto de "uso justo"
};

const PLANOS_PAGOS = ["passe", "temporada", "anual"];

function paraMillis(valor) {
    if (!valor) return 0;
    if (typeof valor.toMillis === "function") return valor.toMillis();
    if (typeof valor.seconds === "number") return valor.seconds * 1000;
    const t = Date.parse(valor);
    return Number.isFinite(t) ? t : 0;
}

// "gratis" ou "pago" a partir do documento usuarios/{uid}
export function tipoDoPlano(dadosUsuario, agora = Date.now()) {
    if (!dadosUsuario || !PLANOS_PAGOS.includes(dadosUsuario.plano)) return "gratis";
    return paraMillis(dadosUsuario.planoAte) > agora ? "pago" : "gratis";
}

export async function limitesDoUsuario(db, uid) {
    try {
        const snap = await db.collection("usuarios").doc(uid).get();
        const tipo = tipoDoPlano(snap.exists ? snap.data() : null);
        return { tipo, ...LIMITES[tipo] };
    } catch (erro) {
        // na dúvida, não prende ninguém fora: usa o gratuito, que ainda funciona
        console.error("Plano: não foi possível ler o plano:", erro.message);
        return { tipo: "gratis", ...LIMITES.gratis };
    }
}
