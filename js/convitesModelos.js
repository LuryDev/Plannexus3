// ==========================================================
//  MODELOS DE CONVITE COM DESIGN PRÓPRIO  (js/convitesModelos.js)
//
//  Cada modelo é uma arte pronta (fotos/convites/*.jpg, sem os textos que
//  mudam) + a lista de campos editáveis + onde cada texto é desenhado.
//  O usuário só altera o que estava entre chaves {} no design; o resto da
//  arte é fixo. Ele também pode escolher a fonte de cada texto.
//
//  Para ADICIONAR um modelo novo:
//    1) coloque a arte (sem os textos entre chaves) em fotos/convites/
//    2) acrescente um item em MODELOS (grupo, categoria, campos, desenho)
//  Tipos de evento sem modelo aqui continuam com o "modelo simples".
//
//  Todas as medidas estão no espaço da arte (1600 x 1135).
// ==========================================================

export const LARGURA_ARTE = 1600;
export const ALTURA_ARTE  = 1135;

// ---------- fontes que o usuário pode escolher ----------
export const FONTES = [
    { f: "Fredoka",          p: 600, n: "Arredondada" },
    { f: "Chewy",            p: 400, n: "Divertida" },
    { f: "Baloo 2",          p: 600, n: "Macia" },
    { f: "Poppins",          p: 500, n: "Moderna" },
    { f: "Montserrat",       p: 700, n: "Forte" },
    { f: "Playfair Display", p: 700, n: "Serifada" },
    { f: "Allura",           p: 400, n: "Manuscrita" },
    { f: "Great Vibes",      p: 400, n: "Caligráfica" },
    { f: "Dancing Script",   p: 600, n: "Cursiva" },
    { f: "Lobster",          p: 400, n: "Retrô" }
];

export const LINK_FONTES = "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Chewy&family=Baloo+2:wght@600&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@500;700&family=Playfair+Display:wght@600;700&family=Allura&family=Great+Vibes&family=Dancing+Script:wght@600&family=Lobster&display=swap";

function pesoDa(f) {
    const achada = FONTES.find((x) => x.f === f);
    return achada ? achada.p : 500;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function partesData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? { ano: m[1], mes: Number(m[2]), dia: m[3] } : { ano: "", mes: 0, dia: "" };
}

function horaCurta(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
    return m ? Number(m[1]) + "h" + (m[2] === "00" ? "" : m[2]) : "";
}

// "Chá de bebê do Théo" -> { artigo: "do", pessoa: "Théo" }   (se não achar, vazio)
export function pessoaDoEvento(nomeEvento) {
    const m = /.*\b(d[oa]s?)\s+(.+)$/i.exec(String(nomeEvento || "").trim());
    return m ? { artigo: m[1].toLowerCase(), pessoa: m[2].trim() } : { artigo: "", pessoa: "" };
}

function primeiroNome(txt) { return String(txt || "").trim().split(/\s+/)[0] || ""; }
function restoDoNome(txt)  { return String(txt || "").trim().split(/\s+/).slice(1).join(" "); }

// ---------- campos reaproveitados ----------
const cinza = "#727272";

const CAMPOS_CHA = [
    { c: "pronome",  rotulo: "Pronome (depois de \"CHÁ\")", fonte: "Fredoka", auto: (e) => e.artigo.toUpperCase() },
    { c: "nome",     rotulo: "Nome na faixa", fonte: "Fredoka", auto: (e) => e.pessoa.toUpperCase() }
];

const CAMPOS_DATA_CHA = [
    { c: "dia",      rotulo: "Dia",  fonte: "Fredoka", auto: (e) => partesData(e.data).dia },
    { c: "mes",      rotulo: "Mês",  fonte: "Fredoka", auto: (e) => { const p = partesData(e.data); return p.mes ? MESES[p.mes - 1] : ""; } },
    { c: "horario",  rotulo: "Horário", fonte: "Fredoka", auto: (e) => horaCurta(e.horario) },
    { c: "presente", rotulo: "Sugestão de presente", fonte: "Fredoka", auto: (e) => e.presente || "" }
];

const DESENHO_DATA_CHA = [
    { c: "dia",      x: 368,  y: 834, tam: 124, cor: cinza, max: 250 },
    { c: "mes",      x: 640,  y: 777, tam: 38,  cor: cinza, max: 150 },
    { c: "horario",  x: 640,  y: 853, tam: 44,  cor: cinza, max: 200 },
    { c: "presente", x: 1095, y: 850, tam: 44,  cor: cinza, max: 480 }
];

// ---------- os modelos ----------
// grupo: título da lista | categoria: tipo do evento que ganha "Sugerido"
export const MODELOS = [
    {
        id: "cha-bebe", grupo: "Chá de bebê", categoria: "Chá de Bebê", nome: "Chá de bebê",
        arte: "fotos/convites/cha.jpg", arquivo: "convite-cha-de-bebe",
        campos: [...CAMPOS_CHA, ...CAMPOS_DATA_CHA],
        desenho: [
            { c: "pronome", prefixo: "CHÁ ", x: 800, y: 375, tam: 58, cor: cinza, max: 560 },
            { c: "nome",    x: 800, y: 468, tam: 66, cor: "#4b14a6", max: 430 },
            ...DESENHO_DATA_CHA
        ]
    },
    {
        id: "cha-revelacao", grupo: "Chá de bebê", categoria: "Chá de Bebê", nome: "Chá revelação",
        arte: "fotos/convites/revelacao.jpg", arquivo: "convite-cha-revelacao",
        campos: [
            { c: "nome1", rotulo: "Nome da faixa rosa", ex: "Maria", fonte: "Fredoka" },
            { c: "nome2", rotulo: "Nome da faixa azul", ex: "João",  fonte: "Fredoka" },
            ...CAMPOS_DATA_CHA
        ],
        desenho: [
            { c: "nome1", x: 420,  y: 474, tam: 66, cor: "#111111", max: 330 },
            { c: "nome2", x: 1140, y: 474, tam: 66, cor: "#111111", max: 330 },
            ...DESENHO_DATA_CHA
        ]
    },
    {
        id: "formatura", grupo: "Formatura", categoria: "Formatura", nome: "Formatura",
        arte: "fotos/convites/formatura.jpg", arquivo: "convite-formatura",
        campos: [
            { c: "nome",      rotulo: "Nome (letra grande)", fonte: "Playfair Display", auto: (e) => primeiroNome(e.pessoa) },
            { c: "sobrenome", rotulo: "Sobrenome (letra manuscrita)", fonte: "Allura", auto: (e) => restoDoNome(e.pessoa) },
            { c: "formando",  rotulo: "Formando(a) (no texto)", fonte: "Poppins", auto: (e) => primeiroNome(e.pessoa) },
            { c: "area",      rotulo: "Área de formação (no texto)", fonte: "Poppins" },
            { c: "data",      rotulo: "Data", fonte: "Poppins", auto: (e) => { const p = partesData(e.data); return p.mes ? p.dia + "/" + String(p.mes).padStart(2, "0") + "/" + p.ano : ""; } },
            { c: "horario",   rotulo: "Horário", fonte: "Poppins", auto: (e) => horaCurta(e.horario) },
            { c: "local",     rotulo: "Local", fonte: "Poppins", auto: (e) => e.local || "" }
        ],
        desenho: [
            { c: "nome",      x: 72, y: 200, tam: 176, cor: "#242424", max: 480, esq: true, base: true },
            { c: "sobrenome", x: 78, y: 292, tam: 124, cor: "#3f0f9b", max: 560, esq: true, base: true },
            { paragrafo: true, x: 77, y: 492, tam: 33, linha: 46, larg: 660, cor: "#1a1a1a",
              partes: ["É com grande alegria que ", { c: "formando" }, " te convida para a sua formatura em ", { c: "area" }, "."] },
            { c: "data",    x: 208, y: 950, tam: 34, cor: "#4e2c14", max: 285, esq: true },
            { c: "horario", x: 507, y: 950, tam: 34, cor: "#4e2c14", max: 215, esq: true },
            { c: "local",   x: 843, y: 947, tam: 34, cor: "#4e2c14", max: 560, esq: true }
        ]
    }
];

export function modeloPorId(id) {
    return MODELOS.find((m) => m.id === id) || null;
}

// evento = { nome, data, horario, local, categoria }  +  primeiroPresente (texto)
export function dadosDoEvento(evento, primeiroPresente) {
    const { artigo, pessoa } = pessoaDoEvento(evento && evento.nome);
    return {
        artigo, pessoa,
        data: evento && evento.data, horario: evento && evento.horario, local: evento && evento.local,
        presente: primeiroPresente || ""
    };
}

export function valorAutomatico(campo, dados) {
    return campo.auto ? (campo.auto(dados) || "") : (campo.ex || "");
}

export function valoresIniciais(modelo, dados) {
    const valores = {}, fontes = {};
    modelo.campos.forEach((campo) => {
        valores[campo.c] = valorAutomatico(campo, dados);
        fontes[campo.c] = campo.fonte;
    });
    return { valores, fontes };
}

// ---------- desenho ----------
const imagens = {};
function carregarArte(src) {
    if (!imagens[src]) {
        imagens[src] = new Promise((ok) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = () => ok(null);
            img.src = src;
        });
    }
    return imagens[src];
}

function garantirFonte(f) {
    try { return document.fonts.load(pesoDa(f) + ' 40px "' + f + '"', "AaBb Çã"); }
    catch (e) { return Promise.resolve(); }
}

function fonteCss(f, tam) {
    return pesoDa(f) + " " + tam + 'px "' + f + '", system-ui, sans-serif';
}

// diminui a letra até o texto caber na largura
function ajustar(ctx, texto, f, tam, max) {
    let t = tam;
    ctx.font = fonteCss(f, t);
    while (ctx.measureText(texto).width > max && t > tam * 0.45) {
        t -= 2;
        ctx.font = fonteCss(f, t);
    }
    return t;
}

// desenha o modelo no canvas (largura em pixels; a altura segue a proporção da arte)
export async function desenharModelo(canvas, modelo, valores, fontes, largura = 1600) {
    const usadas = new Set(Object.values(fontes));
    usadas.add("Poppins");
    await Promise.all([...usadas].map(garantirFonte));
    const arte = await carregarArte(modelo.arte);

    canvas.width = largura;
    canvas.height = Math.round(largura * ALTURA_ARTE / LARGURA_ARTE);

    const ctx = canvas.getContext("2d");
    const escala = largura / LARGURA_ARTE;

    ctx.save();
    ctx.scale(escala, escala);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    if (arte) ctx.drawImage(arte, 0, 0, LARGURA_ARTE, ALTURA_ARTE);
    else { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, LARGURA_ARTE, ALTURA_ARTE); }

    modelo.desenho.forEach((d) => {
        ctx.fillStyle = d.cor;
        ctx.textBaseline = d.base ? "alphabetic" : "middle";

        // parágrafo com campos no meio do texto (quebra de linha automática)
        if (d.paragrafo) {
            const palavras = [];
            d.partes.forEach((p) => {
                if (typeof p === "string") {
                    p.split(/(\s+)/).forEach((w) => { if (w) palavras.push({ t: w, f: "Poppins" }); });
                } else {
                    String(valores[p.c] || "{" + p.c + "}").split(/(\s+)/).forEach((w) => { if (w) palavras.push({ t: w, f: fontes[p.c] }); });
                }
            });

            let x = 0, y = d.y, linha = [];
            const fechar = () => {
                let cx = d.x;
                linha.forEach((w) => { ctx.font = fonteCss(w.f, d.tam); ctx.fillText(w.t, cx, y); cx += w.larg; });
                y += d.linha; linha = []; x = 0;
            };

            palavras.forEach((w) => {
                ctx.font = fonteCss(w.f, d.tam);
                w.larg = ctx.measureText(w.t).width;
                const espaco = /^\s+$/.test(w.t);

                if (!espaco && x + w.larg > d.larg && linha.length) {
                    while (linha.length && /^\s+$/.test(linha[linha.length - 1].t)) linha.pop();
                    fechar();
                }
                if (espaco && !linha.length) return;
                linha.push(w);
                x += w.larg;
            });
            if (linha.length) fechar();
            return;
        }

        // texto simples (vazio aparece como {nome-do-campo} esmaecido)
        const vazio = !valores[d.c];
        const texto = (d.prefixo || "") + (vazio ? "{" + d.c + "}" : valores[d.c]);
        if (vazio) ctx.globalAlpha = 0.35;

        const tam = ajustar(ctx, texto, fontes[d.c], d.tam, d.max);
        ctx.font = fonteCss(fontes[d.c], tam);
        ctx.textAlign = d.esq ? "left" : "center";
        ctx.fillText(texto, d.x, d.y);
        ctx.globalAlpha = 1;
    });

    ctx.restore();
}
