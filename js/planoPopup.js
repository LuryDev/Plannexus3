// ==========================================================
//  js/planoPopup.js  —  Oferta dos planos (pop-up com animação)
//
//  Quando alguém do plano gratuito esbarra num limite, aparece um pop-up
//  animado com o Nexus oferecendo os planos.
//
//  Regra do "não encher o saco": se a pessoa clicar em "Agora não", o
//  pop-up não aparece mais por 24 horas. Depois volta a aparecer.
//  (Nesse período, o app ainda mostra um avisinho discreto na parte de
//  baixo, senão o botão parece quebrado.)
//
//  Quem clica no botão do Nexus+ (ao lado da engrenagem) está PEDINDO para
//  ver: nesse caso o pop-up aparece sempre, mesmo dentro das 24 horas.
//
//  Como usar:
//      import { ofertaDePlanos, limparRecusa } from "./js/planoPopup.js";
//      ofertaDePlanos("eventos", { ativos: 3, limite: 3 });
//      ofertaDePlanos("convite", { forcar: true });
//
//  O CSS vai junto neste arquivo (função estilos()) para o pop-up poder
//  ser usado em qualquer tela sem precisar mexer no <head> de cada uma.
// ==========================================================

const CHAVE_RECUSA = "plannexus_oferta_recusada";
const HORAS_DE_SILENCIO = 24;

// ---------- os planos (fonte única: a página planos.html usa esta mesma lista) ----------
export const CATALOGO = [
    {
        id: "passe", nome: "1 evento", preco: "R$ 9,90", periodo: "pagamento único",
        detalhe: "Tudo liberado em um evento",
        resumo: "Para quem vai organizar uma festa só e quer tudo liberado nela."
    },
    {
        id: "temporada", nome: "3 meses", preco: "R$ 29,90", periodo: "por 3 meses",
        detalhe: "Eventos ilimitados por 3 meses",
        resumo: "Para a temporada de festas: quantos eventos você quiser, por 3 meses."
    },
    {
        id: "anual", nome: "1 ano", preco: "R$ 59,90", periodo: "por 12 meses", destaque: true,
        detalhe: "Cerca de R$ 5 por mês",
        resumo: "O ano inteiro liberado, por cerca de R$ 5 por mês."
    }
];

// ---------- o que escrever em cada situação ----------
// "ganhos" = o que o plano pago resolve NAQUELE limite que a pessoa esbarrou.
// O primeiro item é sempre a resposta direta ao limite, e os outros vêm depois.
const MOTIVOS = {
    eventos: {
        figura: "fotos/curioso.png",
        titulo: "Você chegou ao limite de eventos",
        texto: (d) => `O plano gratuito deixa ter <b>${d.limite || 3}</b> eventos ao mesmo tempo e você já tem <b>${d.ativos != null ? d.ativos : d.limite || 3}</b>.`,
        dica: "Seus eventos continuam todos aí: dá para arquivar um que já passou (ele sai da conta e pode voltar depois).",
        ganhos: [
            "Eventos ativos <b>ilimitados</b> — sem precisar arquivar nada",
            "Mais mensagens do Nexus por mês",
            "Mais arquivos guardados em cada evento"
        ]
    },
    nexus: {
        figura: "fotos/curioso.png",
        titulo: "As mensagens do Nexus acabaram",
        texto: () => "Você usou as mensagens de criação por IA que o plano gratuito dá neste mês.",
        dica: "Elas voltam no mês que vem. Criar o evento pelo formulário continua de graça e sem limite de convidados.",
        ganhos: [
            "Nexus liberado o mês inteiro (uso justo)",
            "Eventos ativos ilimitados",
            "Mais arquivos guardados em cada evento"
        ]
    },
    anexos: {
        figura: "fotos/curioso.png",
        titulo: "Limite de arquivos deste evento",
        texto: () => "O plano gratuito guarda menos arquivos por evento.",
        dica: "Dá para apagar um arquivo que você não usa mais para liberar espaço.",
        ganhos: [
            "Mais arquivos em cada evento (contratos, recibos, PDF)",
            "Eventos ativos ilimitados",
            "Mais mensagens do Nexus por mês"
        ]
    },
    convite: {
        figura: "fotos/comemorando.png",
        titulo: "Libere tudo no Plannexus",
        texto: () => "Os planos tiram os limites do plano gratuito. O resto do app continua igual.",
        dica: "Convidados, tarefas, orçamento, calendário e notas são sem limite para todo mundo, sempre.",
        ganhos: [
            "Eventos ativos ilimitados",
            "Mais mensagens do Nexus por mês",
            "Mais arquivos guardados em cada evento"
        ]
    }
};

// ---------- memória da recusa (24 h) ----------
export function recusouRecentemente() {
    try {
        const quando = Number(localStorage.getItem(CHAVE_RECUSA) || 0);
        return quando > 0 && (Date.now() - quando) < HORAS_DE_SILENCIO * 60 * 60 * 1000;
    } catch (e) {
        return false;   // navegador sem localStorage: mostra normalmente
    }
}

export function limparRecusa() {
    try { localStorage.removeItem(CHAVE_RECUSA); } catch (e) { /* ok */ }
}

function guardarRecusa() {
    try { localStorage.setItem(CHAVE_RECUSA, String(Date.now())); } catch (e) { /* ok */ }
}

export function horasAteVoltar() {
    try {
        const quando = Number(localStorage.getItem(CHAVE_RECUSA) || 0);
        if (!quando) return 0;
        const faltam = HORAS_DE_SILENCIO * 60 * 60 * 1000 - (Date.now() - quando);
        return faltam > 0 ? Math.ceil(faltam / (60 * 60 * 1000)) : 0;
    } catch (e) {
        return 0;
    }
}

// ---------- CSS (vai junto para funcionar em qualquer tela) ----------
function estilos() {
    if (document.getElementById("pnx-estilo-oferta")) return;

    const tag = document.createElement("style");
    tag.id = "pnx-estilo-oferta";
    tag.textContent = `
#pnx-oferta{position:fixed;inset:0;z-index:100000;display:flex;align-items:flex-end;justify-content:center;
    padding:16px;background:rgba(28,20,56,.55);backdrop-filter:blur(2px);animation:pnx-fundo .22s ease both;
    font-family:'Poppins',Arial,sans-serif}
@media (min-width:520px){#pnx-oferta{align-items:center}}
#pnx-oferta .cartao{position:relative;width:100%;max-width:380px;background:#fff;color:#25213a;border-radius:26px;
    padding:0 22px 22px;box-shadow:0 20px 60px rgba(32,16,80,.35);animation:pnx-sobe .42s cubic-bezier(.22,1.2,.36,1) both;
    max-height:92vh;overflow:auto}
#pnx-oferta .palco{position:relative;height:92px;margin:0 -22px 2px;border-radius:26px 26px 0 0;overflow:hidden;
    background:radial-gradient(circle at 50% 120%,rgba(164,145,249,.45),transparent 70%),#f3efff;
    display:flex;align-items:flex-end;justify-content:center}
#pnx-oferta .palco img{height:82px;object-fit:contain;animation:pnx-flutua 3.2s ease-in-out .3s infinite}
#pnx-oferta .faisca{position:absolute;width:12px;height:12px;opacity:0;
    background:conic-gradient(from 0deg,transparent 0 12%,#a491f9 12% 13%,transparent 13% 37%,#a491f9 37% 38%,transparent 38% 62%,#a491f9 62% 63%,transparent 63% 87%,#a491f9 87% 88%,transparent 88%);
    border-radius:50%;animation:pnx-brilha 2.4s ease-in-out infinite}
#pnx-oferta .f1{left:22%;top:26%;animation-delay:.25s}
#pnx-oferta .f2{right:20%;top:18%;width:16px;height:16px;animation-delay:.8s}
#pnx-oferta .f3{right:30%;bottom:22%;animation-delay:1.4s}
#pnx-oferta h2{margin:12px 0 6px;font-size:1.15rem;line-height:1.3;color:#34206f;font-weight:700}
#pnx-oferta p{margin:0 0 8px;font-size:.93rem;line-height:1.5}
#pnx-oferta .dica{color:#5b5473;font-size:.85rem}
#pnx-oferta .titulo-ganhos{margin:14px 0 8px;font-size:.84rem;font-weight:700;color:#34206f;
    text-transform:uppercase;letter-spacing:.4px}
#pnx-oferta .ganhos{list-style:none;margin:0;padding:0;display:grid;gap:7px}
#pnx-oferta .ganhos li{display:flex;align-items:flex-start;gap:9px;font-size:.88rem;line-height:1.4;
    opacity:0;animation:pnx-item .32s ease forwards}
#pnx-oferta .ganhos li:nth-child(1){animation-delay:.14s}
#pnx-oferta .ganhos li:nth-child(2){animation-delay:.2s}
#pnx-oferta .ganhos li:nth-child(3){animation-delay:.26s}
#pnx-oferta .ganhos li:nth-child(4){animation-delay:.32s}
#pnx-oferta .ganhos .tique{flex:none;width:21px;height:21px;border-radius:7px;background:#e8f7ee;color:#1c7a43;
    display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;margin-top:1px}
#pnx-oferta .planos{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:16px 0}
#pnx-oferta .plano{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    padding:10px 6px;border:1px solid #e9e4f7;border-radius:14px;text-align:center;
    background:#fdfcff;opacity:0;animation:pnx-item .32s ease forwards}
#pnx-oferta .plano:nth-child(1){animation-delay:.34s}
#pnx-oferta .plano:nth-child(2){animation-delay:.4s}
#pnx-oferta .plano:nth-child(3){animation-delay:.46s}
#pnx-oferta .plano.destaque{border-color:#5A32D3;background:#faf8ff;box-shadow:0 4px 14px rgba(90,50,211,.14)}
#pnx-oferta .plano b{font-size:.8rem;color:#6b6585;font-weight:600}
#pnx-oferta .plano .preco{font-weight:800;font-size:.92rem;color:#5A32D3;white-space:nowrap}
#pnx-oferta .botoes{display:flex;flex-direction:column;gap:8px}
#pnx-oferta .botoes a,#pnx-oferta .botoes button{min-height:48px;border:0;border-radius:14px;font-family:inherit;
    font-size:.95rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none}
#pnx-oferta .ver{background:linear-gradient(135deg,#a491f9,#4d2fb8);color:#fff;box-shadow:0 8px 20px rgba(90,50,211,.28)}
#pnx-oferta .depois{background:#f1edfc;color:#5b5473}
#pnx-oferta .fechar{position:absolute;top:10px;right:10px;width:36px;height:36px;border:0;border-radius:50%;
    background:rgba(255,255,255,.85);color:#5b5473;font-size:20px;line-height:1;cursor:pointer}
#pnx-oferta .aviso-24h{margin:10px 0 0;text-align:center;font-size:.76rem;color:#8c86a3}

#pnx-recado{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:100000;max-width:min(92vw,420px);
    display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:#2b2347;color:#fff;
    font-family:'Poppins',Arial,sans-serif;font-size:.85rem;line-height:1.4;box-shadow:0 14px 34px rgba(20,12,45,.4);
    animation:pnx-recado-entra .3s ease both}
#pnx-recado a{color:#cdbcff;font-weight:700;white-space:nowrap}
#pnx-recado.saindo{animation:pnx-recado-sai .3s ease both}

@keyframes pnx-fundo{from{opacity:0}to{opacity:1}}
@keyframes pnx-sobe{0%{opacity:0;transform:translateY(40px) scale(.92)}60%{transform:translateY(-6px) scale(1.012)}100%{opacity:1;transform:none}}
@keyframes pnx-flutua{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-9px) rotate(2deg)}}
@keyframes pnx-brilha{0%{opacity:0;transform:scale(.3) rotate(0)}45%{opacity:1;transform:scale(1) rotate(45deg)}100%{opacity:0;transform:scale(.5) rotate(90deg)}}
@keyframes pnx-item{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pnx-recado-entra{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes pnx-recado-sai{to{opacity:0;transform:translate(-50%,16px)}}

/* botão Nexus+ (ao lado da engrenagem) */
.nexus-mais{position:relative;display:inline-flex;align-items:center;justify-content:center;
    width:34px;height:34px;border:0;padding:0;background:none;cursor:pointer;line-height:0}
.nexus-mais img{width:34px;height:34px;object-fit:contain;border-radius:11px;
    box-shadow:0 4px 12px rgba(90,50,211,.32)}
.nexus-mais .mais{position:absolute;right:-5px;bottom:-5px;width:18px;height:18px;border-radius:50%;
    background:#5A32D3;color:#fff;font-size:13px;font-weight:800;line-height:18px;text-align:center;
    border:2px solid #fff;box-sizing:content-box;
    box-shadow:0 2px 6px rgba(45,25,100,.25);animation:pnx-pulsa 2.6s ease-in-out infinite}
@keyframes pnx-pulsa{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}

/* tema escuro (este CSS mora aqui dentro, entao nao entra em css/temaEscuro.css) */
html.tema-escuro #pnx-oferta .cartao{background:#1e1a35;color:#e7e4f2;box-shadow:0 20px 60px rgba(5,2,16,.6)}
html.tema-escuro #pnx-oferta .palco{background:radial-gradient(circle at 50% 120%,rgba(164,145,249,.3),transparent 70%),#241f3d}
html.tema-escuro #pnx-oferta h2{color:#cdbcff}
html.tema-escuro #pnx-oferta .dica{color:#a9a2c4}
html.tema-escuro #pnx-oferta .titulo-ganhos{color:#cdbcff}
html.tema-escuro #pnx-oferta .ganhos .tique{background:#1c3a2b;color:#7fd8a4}
html.tema-escuro #pnx-oferta .plano{background:#221d3a;border-color:#332b52}
html.tema-escuro #pnx-oferta .plano.destaque{background:#271f47;border-color:#7a5cf0}
html.tema-escuro #pnx-oferta .plano b{color:#ddd3ff}
html.tema-escuro #pnx-oferta .plano small{color:#a9a2c4}
html.tema-escuro #pnx-oferta .plano .preco{color:#b9a4f6}
html.tema-escuro #pnx-oferta .depois{background:#2a2447;color:#cfc9e6}
html.tema-escuro #pnx-oferta .fechar{background:rgba(40,33,66,.9);color:#cfc9e6}
html.tema-escuro #pnx-oferta .aviso-24h{color:#8e86a8}

@media (prefers-reduced-motion:reduce){
    #pnx-oferta,#pnx-oferta .cartao,#pnx-oferta .palco img,#pnx-oferta .faisca,#pnx-oferta .plano,
    #pnx-oferta .ganhos li,#pnx-recado,.nexus-mais .mais{animation:none !important;opacity:1 !important}
}`;
    document.head.appendChild(tag);
}

// ---------- avisinho discreto (quando a pessoa já recusou) ----------
export function recadoCurto(texto) {
    estilos();
    const antigo = document.getElementById("pnx-recado");
    if (antigo) antigo.remove();

    const caixa = document.createElement("div");
    caixa.id = "pnx-recado";
    caixa.setAttribute("role", "status");
    caixa.innerHTML = `<span>${texto}</span><a href="planos.html">Ver planos</a>`;
    document.body.appendChild(caixa);

    setTimeout(() => {
        caixa.classList.add("saindo");
        setTimeout(() => caixa.remove(), 320);
    }, 6000);
}

// ---------- o pop-up ----------
export function ofertaDePlanos(motivo = "convite", opcoes = {}) {
    const dados = MOTIVOS[motivo] || MOTIVOS.convite;
    const pedido = opcoes.forcar === true || motivo === "convite";

    // dentro das 24 horas de silêncio: só o avisinho (a não ser que a pessoa tenha pedido)
    if (!pedido && recusouRecentemente()) {
        recadoCurto(opcoes.recado || dados.titulo + ".");
        return false;
    }

    estilos();
    if (document.getElementById("pnx-oferta")) return true;

    const fundo = document.createElement("div");
    fundo.id = "pnx-oferta";
    fundo.setAttribute("role", "dialog");
    fundo.setAttribute("aria-modal", "true");
    fundo.setAttribute("aria-label", dados.titulo);

    fundo.innerHTML = `
        <div class="cartao">
            <div class="palco">
                <span class="faisca f1"></span><span class="faisca f2"></span><span class="faisca f3"></span>
                <img src="${dados.figura}" alt="Nexus, o assistente do Plannexus">
            </div>
            <button type="button" class="fechar" aria-label="Fechar">&times;</button>
            <h2>${dados.titulo}</h2>
            <p>${dados.texto(opcoes)}</p>
            <p class="dica">${dados.dica}</p>
            <p class="titulo-ganhos">Com um plano pago você tem:</p>
            <ul class="ganhos">
                ${dados.ganhos.map((g) => `<li><span class="tique" aria-hidden="true">&#10003;</span><span>${g}</span></li>`).join("")}
            </ul>
            <div class="planos">
                ${CATALOGO.map((p) => `
                    <div class="plano${p.destaque ? " destaque" : ""}">
                        <b>${p.nome}</b>
                        <span class="preco">${p.preco}</span>
                    </div>`).join("")}
            </div>
            <div class="botoes">
                <a class="ver" href="planos.html">Ver os planos</a>
                <button type="button" class="depois">Agora não</button>
            </div>
            <p class="aviso-24h">Se escolher "Agora não", a gente não mostra isso de novo por 24 horas.</p>
        </div>`;

    function fechar(recusou) {
        if (recusou) guardarRecusa();
        fundo.remove();
        document.removeEventListener("keydown", aoTeclar);
    }
    function aoTeclar(e) { if (e.key === "Escape") fechar(true); }

    fundo.querySelector(".depois").addEventListener("click", () => fechar(true));
    fundo.querySelector(".fechar").addEventListener("click", () => fechar(true));
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(true); });
    document.addEventListener("keydown", aoTeclar);

    document.body.appendChild(fundo);
    fundo.querySelector(".ver").focus();
    return true;
}

// ---------- botão Nexus+ no topo ----------
// Coloca o botão ao lado da engrenagem. Some sozinho em quem já tem plano pago.
export function botaoNexusMais(vizinho, { escondidoSe = false } = {}) {
    if (!vizinho || escondidoSe || document.getElementById("botaoNexusMais")) return null;

    estilos();
    const botao = document.createElement("button");
    botao.type = "button";
    botao.id = "botaoNexusMais";
    botao.className = "nexus-mais";
    botao.title = "Liberar tudo no Plannexus";
    botao.setAttribute("aria-label", "Conhecer os planos do Plannexus");
    botao.innerHTML = '<img src="fotos/logo.png" alt=""><span class="mais" aria-hidden="true">+</span>';
    botao.addEventListener("click", () => ofertaDePlanos("convite", { forcar: true }));

    vizinho.insertAdjacentElement("afterend", botao);
    return botao;
}
