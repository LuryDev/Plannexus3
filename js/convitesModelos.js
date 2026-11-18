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
    { f: "Lobster",          p: 400, n: "Retrô" },
    { f: "Josefin Sans",     p: 400, n: "Fina" },
    { f: "Bebas Neue",       p: 400, n: "Condensada" }
];

export const LINK_FONTES = "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600&family=Chewy&family=Baloo+2:wght@600&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@500;700&family=Playfair+Display:wght@600;700&family=Allura&family=Great+Vibes&family=Dancing+Script:wght@600&family=Lobster&family=Josefin+Sans:wght@400&family=Bebas+Neue&display=swap";

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
    { c: "dia",      item: "esq", x: 368,  y: 834, tam: 124, cor: cinza, max: 250 },
    { c: "mes",      item: "esq", x: 640,  y: 777, tam: 38,  cor: cinza, max: 150 },
    { c: "horario",  item: "esq", x: 640,  y: 853, tam: 44,  cor: cinza, max: 200 },
    { c: "presente", item: "dir", x: 1095, y: 850, tam: 44,  cor: cinza, max: 480 }
];

// ---------- os modelos ----------
// grupo: título da lista | categoria: tipo do evento que ganha "Sugerido"
export const MODELOS = [
    {
        id: "cha-bebe", grupo: "Chá de bebê", categoria: "Chá de Bebê", nome: "Chá de bebê",
        arte: "fotos/convites/cha.jpg", arquivo: "convite-cha-de-bebe",
        itens: {
            esq: {"sprite": "fotos/convites/itens/cha-bebe_esq.png", "x": 238, "y": 737, "w": 532, "h": 185, "campos": ["dia", "mes", "horario"]},
            div: {"sprite": "fotos/convites/itens/cha-bebe_div.png", "x": 792, "y": 735, "w": 16, "h": 186, "todos": ["esq", "dir"]},
            dir: {"sprite": "fotos/convites/itens/cha-bebe_dir.png", "x": 829, "y": 740, "w": 529, "h": 173, "campos": ["presente"]}
        },
        fluxos: [{ tipo: "fila", ids: ["esq", "dir"], alinhar: "centro", gap: 59 }],
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
        itens: {
            esq: {"sprite": "fotos/convites/itens/cha-revelacao_esq.png", "x": 238, "y": 737, "w": 532, "h": 185, "campos": ["dia", "mes", "horario"]},
            div: {"sprite": "fotos/convites/itens/cha-revelacao_div.png", "x": 792, "y": 735, "w": 16, "h": 186, "todos": ["esq", "dir"]},
            dir: {"sprite": "fotos/convites/itens/cha-revelacao_dir.png", "x": 829, "y": 740, "w": 529, "h": 173, "campos": ["presente"]}
        },
        fluxos: [{ tipo: "fila", ids: ["esq", "dir"], alinhar: "centro", gap: 59 }],
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
        itens: {
            detalhes: {"sprite": "fotos/convites/itens/formatura_detalhes.png", "x": 82, "y": 799, "w": 322, "h": 35, "depende": ["data", "horario", "local"]},
            data: {"sprite": "fotos/convites/itens/formatura_data.png", "x": 79, "y": 872, "w": 246, "h": 94, "campos": ["data"], "passo": 314},
            horario: {"sprite": "fotos/convites/itens/formatura_horario.png", "x": 393, "y": 872, "w": 309, "h": 94, "campos": ["horario"], "passo": 366},
            local: {"sprite": "fotos/convites/itens/formatura_local.png", "x": 759, "y": 872, "w": 221, "h": 98, "campos": ["local"]}
        },
        fluxos: [{ tipo: "fila", ids: ["data", "horario", "local"], alinhar: "esq" }],
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
              partes: (v) => [
                  preenchido(v.formando) ? "É com grande alegria que " : "Você está convidado(a) para uma formatura",
                  preenchido(v.formando) ? { c: "formando" } : "",
                  preenchido(v.formando) ? " te convida para a sua formatura" : "",
                  preenchido(v.area) ? " em " : "", { c: "area" }, "."
              ] },
            { c: "data",    item: "data",    x: 208, y: 950, tam: 34, cor: "#4e2c14", max: 175, esq: true },
            { c: "horario", item: "horario", x: 507, y: 950, tam: 34, cor: "#4e2c14", max: 230, esq: true },
            { c: "local",   item: "local",   x: 843, y: 947, tam: 34, cor: "#4e2c14", max: 560, esq: true }
        ]
    }
];

// ---------- aniversário e casamento ----------
const CAMPOS_ANIVERSARIO = (rotuloNome, fonteNome) => [
    { c: "idade",   rotulo: "Idade (ex.: 10 ANOS)", fonte: "Montserrat", ex: "10 ANOS" },
    { c: "pronome", rotulo: "Pronome (DO / DA)",    fonte: "Montserrat", auto: (e) => e.artigo.toUpperCase() },
    { c: "nome",    rotulo: rotuloNome,             fonte: fonteNome,    auto: (e) => e.pessoa },
    { c: "data",    rotulo: "Data",    fonte: "Poppins", auto: (e) => dataCurta(e.data) },
    { c: "horario", rotulo: "Horário", fonte: "Poppins", auto: (e) => horaCurta(e.horario) },
    { c: "local",   rotulo: "Local",   fonte: "Poppins", auto: (e) => e.local || "" }
];

function dataCurta(iso) {
    const p = partesData(iso);
    return p.mes ? p.dia + "/" + String(p.mes).padStart(2, "0") + "/" + p.ano : "";
}

MODELOS.push(
    {
        id: "aniversario-bolo", grupo: "Aniversário", categoria: "Aniversário", nome: "Aniversário (bolo)",
        arte: "fotos/convites/aniversario-bolo.jpg", arquivo: "convite-aniversario-bolo",
        itens: {
            detalhes: {"sprite": "fotos/convites/itens/aniversario-bolo_detalhes.png", "x": 515, "y": 810, "w": 329, "h": 46, "depende": ["data", "horario", "local"]},
            data: {"sprite": "fotos/convites/itens/aniversario-bolo_data.png", "x": 521, "y": 886, "w": 243, "h": 95, "campos": ["data"], "passo": 310},
            horario: {"sprite": "fotos/convites/itens/aniversario-bolo_horario.png", "x": 831, "y": 886, "w": 310, "h": 95, "campos": ["horario"], "passo": 367},
            local: {"sprite": "fotos/convites/itens/aniversario-bolo_local.png", "x": 1198, "y": 886, "w": 220, "h": 98, "campos": ["local"]}
        },
        fluxos: [{ tipo: "fila", ids: ["data", "horario", "local"], alinhar: "esq" }],
        campos: CAMPOS_ANIVERSARIO("Nome (letra manuscrita)", "Allura"),
        desenho: [
            { linha1: true, partes: [{ c: "idade" }, " ", { c: "pronome" }], x: 1094, y: 173, tam: 42, cor: "#111111", max: 620, esp: 9, maiusc: true },
            { c: "nome", x: 1101, y: 306, tam: 150, cor: "#3f087c", max: 620 },
            { c: "data",    item: "data",    x: 648,  y: 964, tam: 34, cor: "#451f07", max: 175, esq: true },
            { c: "horario", item: "horario", x: 945,  y: 964, tam: 34, cor: "#451f07", max: 165, esq: true },
            { c: "local",   item: "local",   x: 1282, y: 961, tam: 34, cor: "#451f07", max: 290, esq: true }
        ]
    },
    {
        id: "aniversario-baloes", grupo: "Aniversário", categoria: "Aniversário", nome: "Aniversário (balões)",
        arte: "fotos/convites/aniversario-baloes.jpg", arquivo: "convite-aniversario-baloes",
        itens: {
            dh:  { campos: ["data", "horario"], x: 0, y: 750, w: 1600, h: 48, passo: 91 },
            loc: { campos: ["local"],           x: 0, y: 841, w: 1600, h: 48 }
        },
        fluxos: [{ tipo: "pilha", ids: ["dh", "loc"], alinhar: "centro" }],
        campos: [
            ...CAMPOS_ANIVERSARIO("Nome (letra manuscrita)", "Allura").filter((c) => c.c !== "data" && c.c !== "horario"),
            { c: "data",    rotulo: "Data",    fonte: "Poppins", auto: (e) => dataCurta(e.data) },
            { c: "horario", rotulo: "Horário", fonte: "Poppins", auto: (e) => horaCurta(e.horario) }
        ],
        desenho: [
            { linha1: true, fixoSempre: true, partes: ["O ANIVERSÁRIO DE ", { c: "idade" }, " ", { c: "pronome" }], fixa: "Montserrat", x: 799, y: 398, tam: 52, cor: "#70212a", max: 1150, maiusc: true },
            { c: "nome", x: 800, y: 538, tam: 170, cor: "#1f014b", max: 480 },
            { item: "dh", linha1: true, partes: [{ c: "data" }, " às ", { c: "horario" }], fixa: "Poppins", x: 800, y: 774, tam: 44, cor: "#000000", max: 400 },
            { c: "local", item: "loc", x: 799, y: 865, tam: 40, cor: "#6d212b", max: 560 }
        ]
    },
    {
        id: "casamento-floral", grupo: "Casamento", categoria: "Casamento", nome: "Casamento (floral)",
        arte: "fotos/convites/casamento-floral.jpg", arquivo: "convite-casamento",
        itens: {
            data: {"sprite": "fotos/convites/itens/casamento-floral_data.png", "x": 381, "y": 600, "w": 60, "h": 65, "campos": ["data", "horario"], "passo": 98},
            local: {"sprite": "fotos/convites/itens/casamento-floral_local.png", "x": 384, "y": 698, "w": 67, "h": 76, "campos": ["local"], "passo": 100},
            presente: {"sprite": "fotos/convites/itens/casamento-floral_presente.png", "x": 383, "y": 798, "w": 499, "h": 72, "campos": ["presente"]}
        },
        fluxos: [{ tipo: "pilha", ids: ["data", "local", "presente"], alinhar: "centro" }],
        campos: [
            { c: "noiva",    rotulo: "Noiva",  fonte: "Josefin Sans", ex: "Maria" },
            { c: "noivo",    rotulo: "Noivo",  fonte: "Josefin Sans", ex: "João" },
            { c: "data",     rotulo: "Dia",    fonte: "Josefin Sans", auto: (e) => dataCurta(e.data) },
            { c: "horario",  rotulo: "Horário", fonte: "Josefin Sans", auto: (e) => horaCurta(e.horario) },
            { c: "local",    rotulo: "Local",  fonte: "Josefin Sans", auto: (e) => e.local || "" },
            { c: "presente", rotulo: "Sugestão de presente", fonte: "Josefin Sans", auto: (e) => e.presente || "" }
        ],
        desenho: [
            { c: "noiva", x: 658, y: 314, base: true, tam: 72, cor: "#14002e", max: 330, dir: true, esp: 4, maiusc: true, igual: "nomes" },
            { c: "noivo", x: 744, y: 314, base: true, tam: 72, cor: "#14002e", max: 330, esq: true, esp: 4, maiusc: true, igual: "nomes" },
            { item: "data", linha1: true, partes: [{ c: "data" }, " ÀS ", { c: "horario" }], fixa: "Josefin Sans", x: 469, y: 635, tam: 42, cor: "#14002e", max: 620, esq: true, esp: 3, maiusc: true },
            { c: "local", item: "local", x: 469, y: 742, tam: 42, cor: "#14002e", max: 700, esq: true, esp: 3, maiusc: true },
            { c: "presente", item: "presente", x: 891, y: 841, tam: 38, cor: "#14002e", max: 400, esq: true, esp: 3, maiusc: true }
        ]
    }
);

// ---------- evento corporativo ----------
MODELOS.push({
    id: "corporativo", grupo: "Corporativo", categoria: "Evento Corporativo", nome: "Corporativo",
    arte: "fotos/convites/corporativo.jpg", arquivo: "convite-corporativo",
    itens: {
        data:    { campos: ["data"],    x: 654, y: 488, w: 800, h: 45, passo: 85 },
        horario: { campos: ["horario"], x: 654, y: 573, w: 800, h: 45, passo: 97 },
        local:   { campos: ["local"],   x: 654, y: 670, w: 800, h: 45 }
    },
    fluxos: [{ tipo: "pilha", ids: ["data", "horario", "local"], alinhar: "esq" }],
    campos: [
        { c: "evento",  rotulo: "Nome do evento",   fonte: "Bebas Neue", auto: (e) => e.nome || "" },
        { c: "convidou", rotulo: "Quem convidou (empresa ou pessoa)", fonte: "Poppins", ex: "" },
        { c: "data",    rotulo: "Data",    fonte: "Poppins", auto: (e) => dataCurta(e.data) },
        { c: "horario", rotulo: "Horário", fonte: "Poppins", auto: (e) => horaCurta(e.horario) },
        { c: "local",   rotulo: "Local",   fonte: "Poppins", auto: (e) => e.local || "" }
    ],
    desenho: [
        { c: "evento", x: 1071, y: 186, tam: 118, cor: "#220050", max: 740, duas: true, maiusc: true, sombra: { cor: "#a3adc8", dx: 5, dy: 5 } },
        { paragrafo: true, x: 654, y: 326, tam: 35, linha: 43, larg: 790, cor: "#525669",
          partes: (v) => preenchido(v.convidou)
              ? [{ c: "convidou" }, " tem a satisfação de convidar você para participar do encontro!"]
              : ["Você está convidado(a) para participar do encontro!"] },
        { c: "data",    item: "data",    x: 654, y: 511, tam: 54, cor: "#162045", max: 780, esq: true },
        { c: "horario", item: "horario", x: 654, y: 596, tam: 54, cor: "#162045", max: 780, esq: true },
        { c: "local",   item: "local",   x: 654, y: 693, tam: 54, cor: "#162045", max: 780, esq: true }
    ]
});

// ---------- tipo "Outro" ----------
MODELOS.push({
    id: "outro-convite", grupo: "Outro", categoria: "Outro", nome: "Convite simples",
    arte: "fotos/convites/outro-convite.jpg", arquivo: "convite",
    itens: {
        data: {"sprite": "fotos/convites/itens/outro-convite_data.png", "x": 216, "y": 653, "w": 466, "h": 117, "campos": ["data"], "passo": 531},
        as: {"sprite": "fotos/convites/itens/outro-convite_as.png", "x": 747, "y": 690, "w": 118, "h": 68, "todos": ["data", "horario"], "passo": 160},
        horario: {"sprite": "fotos/convites/itens/outro-convite_hora.png", "x": 907, "y": 650, "w": 369, "h": 130, "campos": ["horario"]},
        local: {"sprite": "fotos/convites/itens/outro-convite_local.png", "x": 398, "y": 815, "w": 810, "h": 57, "campos": ["local"]}
    },
    fluxos: [{ tipo: "fila", ids: ["data", "as", "horario"], alinhar: "centro", centro: 800, sempre: true }],
    campos: [
        { c: "evento",  rotulo: "Nome do evento", fonte: "Playfair Display", auto: (e) => e.nome || "" },
        { c: "data",    rotulo: "Data",    fonte: "Poppins", auto: (e) => dataCurta(e.data) },
        { c: "horario", rotulo: "Horário", fonte: "Poppins", auto: (e) => horaCurta(e.horario) },
        { c: "local",   rotulo: "Local",   fonte: "Josefin Sans", auto: (e) => e.local || "" }
    ],
    desenho: [
        { c: "evento",  x: 797,  y: 448, tam: 150, cor: "#25004a", max: 760, duas: true },
        { c: "data",    item: "data",    x: 446,  y: 718, tam: 78,  cor: "#ff4a6e", max: 390 },
        { c: "horario", item: "horario", x: 1096, y: 718, tam: 78,  cor: "#ff4a6e", max: 300 },
        { c: "local",   item: "local",   x: 801,  y: 844, tam: 32,  cor: "#ffeeff", max: 760, esp: 3, maiusc: true }
    ]
});

export function modeloPorId(id) {
    return MODELOS.find((m) => m.id === id) || null;
}

// evento = { nome, data, horario, local, categoria }  +  primeiroPresente (texto)
export function dadosDoEvento(evento, primeiroPresente) {
    const { artigo, pessoa } = pessoaDoEvento(evento && evento.nome);
    return {
        artigo, pessoa, nome: evento && evento.nome,
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

// campo preenchido? (vazio = o usuário não quis colocar essa informação)
const preenchido = (v) => String(v == null ? "" : v).trim() !== "";

// ---------- itens opcionais: quem aparece e para onde os outros se movem ----------
// modelo.itens = { id: { campos:[...] | depende:[...] | todos:[...], sprite, x, y, w, h, passo } }
// modelo.fluxos = [{ tipo: "fila" | "pilha", ids:[...], alinhar: "centro" | "esq", gap, centro }]
// Um item com todos os campos vazios some (arte e textos); os que sobram se realinham.
function calcularPosicoes(modelo, valores) {
    const itens = modelo.itens || {};
    const ids = Object.keys(itens);
    const presente = {}, desloc = {};

    ids.forEach((id) => { desloc[id] = { dx: 0, dy: 0 }; });
    ids.forEach((id) => {
        if (itens[id].campos) presente[id] = itens[id].campos.some((c) => preenchido(valores[c]));
    });
    ids.forEach((id) => {
        const it = itens[id];
        if (it.campos) return;
        if (it.todos) presente[id] = it.todos.every((x) => presente[x]);
        else if (it.depende) presente[id] = it.depende.some((x) => presente[x]);
        else presente[id] = true;
    });

    (modelo.fluxos || []).forEach((f) => {
        const horiz = f.tipo === "fila";
        const ativos = f.ids.filter((id) => presente[id]);
        if (!ativos.length || (ativos.length === f.ids.length && !f.sempre)) return;   // tudo presente: posições originais (a menos que o fluxo peça para centralizar sempre)

        const pos = (it) => (horiz ? it.x : it.y);
        const tam = (it) => (horiz ? it.w : it.h);
        const passo = (it) => (it.passo != null ? it.passo : tam(it) + (f.gap || 0));

        let total = 0;
        ativos.forEach((id, i) => { total += i < ativos.length - 1 ? passo(itens[id]) : tam(itens[id]); });

        const primeiro = itens[f.ids[0]], ultimo = itens[f.ids[f.ids.length - 1]];
        const centroOriginal = (pos(primeiro) + pos(ultimo) + tam(ultimo)) / 2;
        let cursor = f.alinhar === "esq" ? pos(primeiro) : (f.centro != null ? f.centro : centroOriginal) - total / 2;

        ativos.forEach((id) => {
            const it = itens[id];
            if (horiz) desloc[id].dx = cursor - it.x; else desloc[id].dy = cursor - it.y;
            cursor += passo(it);
        });
    });

    return { presente, desloc };
}

// desenha UM texto do modelo (campos vazios não aparecem)
function desenharTexto(ctx, d, valores, fontes, tamIgual) {
    ctx.fillStyle = d.cor;
    ctx.textBaseline = d.base ? "alphabetic" : "middle";
    if ("letterSpacing" in ctx) ctx.letterSpacing = (d.esp || 0) + "px";
    const caixa = (t) => (d.maiusc ? String(t).toUpperCase() : String(t));
    const alinhamento = d.esq ? "left" : d.dir ? "right" : "center";
    const fim = () => { if ("letterSpacing" in ctx) ctx.letterSpacing = "0px"; };

    // parágrafo com campos no meio do texto (quebra de linha automática)
    if (d.paragrafo) {
        const partes = typeof d.partes === "function" ? d.partes(valores) : d.partes;
        const palavras = [];
        partes.forEach((p) => {
            if (typeof p === "string") {
                p.split(/(\s+)/).forEach((w) => { if (w) palavras.push({ t: w, f: "Poppins" }); });
            } else if (preenchido(valores[p.c])) {
                String(valores[p.c]).split(/(\s+)/).forEach((w) => { if (w) palavras.push({ t: w, f: fontes[p.c] }); });
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
        return fim();
    }

    // uma linha só com campos e textos fixos misturados (ex.: "05/12 às 19h")
    if (d.linha1) {
        const campoDe = (p) => typeof p !== "string";
        const temCampoAntes = (i) => d.partes.slice(0, i).some((p) => campoDe(p) && preenchido(valores[p.c]));
        const temCampoDepois = (i) => d.partes.slice(i + 1).some((p) => campoDe(p) && preenchido(valores[p.c]));
        const primeiroCampo = d.partes.find(campoDe);

        const visiveis = [];
        d.partes.forEach((p, i) => {
            if (campoDe(p)) {
                if (preenchido(valores[p.c])) visiveis.push({ t: caixa(valores[p.c]), f: fontes[p.c] });
            } else {
                const pontas = i === 0 || i === d.partes.length - 1;
                if (pontas || (temCampoAntes(i) && temCampoDepois(i))) {
                    visiveis.push({ t: caixa(p), f: d.fixa || fontes[primeiroCampo.c] });
                }
            }
        });
        if (!d.fixoSempre && !d.partes.some((p) => campoDe(p) && preenchido(valores[p.c]))) return fim();   // sem nenhum campo: nada

        if (visiveis.length) visiveis[visiveis.length - 1].t = visiveis[visiveis.length - 1].t.trimEnd();
        if (!visiveis.length) return fim();
        const medir = (tam) => visiveis.reduce((s, v) => { ctx.font = fonteCss(v.f, tam); return s + ctx.measureText(v.t).width; }, 0);
        let tam = d.tam;
        while (medir(tam) > d.max && tam > d.tam * 0.45) tam -= 2;

        let cx = d.esq ? d.x : d.x - medir(tam) / 2;
        ctx.textAlign = "left";
        visiveis.forEach((v) => {
            ctx.font = fonteCss(v.f, tam);
            ctx.fillText(v.t, cx, d.y);
            cx += ctx.measureText(v.t).width;
        });
        return fim();
    }

    // texto simples
    const valor = valores[d.c];
    if (!preenchido(valor)) {
        // sem o campo: só aparece o texto fixo que vem antes dele (ex.: "CHÁ")
        if (d.prefixo && d.prefixo.trim()) {
            ctx.font = fonteCss(fontes[d.c], d.tam);
            ctx.textAlign = alinhamento;
            ctx.fillText(d.prefixo.trim(), d.x, d.y);
        }
        return fim();
    }

    const texto = (d.prefixo || "") + caixa(String(valor).trim());

    // texto longo em até 2 linhas (opção "duas")
    if (d.duas) {
        ctx.font = fonteCss(fontes[d.c], d.tam);
        if (ctx.measureText(texto).width > d.max) {
            const pal = texto.split(/\s+/);
            let melhor = null;
            for (let i = 1; i < pal.length; i++) {
                const l1 = pal.slice(0, i).join(" "), l2 = pal.slice(i).join(" ");
                const w = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width);
                if (!melhor || w < melhor.w) melhor = { l1, l2, w };
            }
            if (melhor) {
                const t2 = Math.min(d.tam, ajustar(ctx, melhor.l1.length > melhor.l2.length ? melhor.l1 : melhor.l2, fontes[d.c], d.tam, d.max));
                ctx.font = fonteCss(fontes[d.c], t2);
                ctx.textAlign = alinhamento;
                if (d.sombra) {
                    const cor = ctx.fillStyle;
                    ctx.fillStyle = d.sombra.cor;
                    ctx.fillText(melhor.l1, d.x + d.sombra.dx, d.y - t2 * 0.55 + d.sombra.dy);
                    ctx.fillText(melhor.l2, d.x + d.sombra.dx, d.y + t2 * 0.55 + d.sombra.dy);
                    ctx.fillStyle = cor;
                }
                ctx.fillText(melhor.l1, d.x, d.y - t2 * 0.55);
                ctx.fillText(melhor.l2, d.x, d.y + t2 * 0.55);
                return fim();
            }
        }
    }

    const tam = d.igual && tamIgual[d.igual] ? tamIgual[d.igual] : ajustar(ctx, texto, fontes[d.c], d.tam, d.max);
    ctx.font = fonteCss(fontes[d.c], tam);
    ctx.textAlign = alinhamento;
    if (d.sombra) {
        const cor = ctx.fillStyle;
        ctx.fillStyle = d.sombra.cor;
        ctx.fillText(texto, d.x + d.sombra.dx, d.y + d.sombra.dy);
        ctx.fillStyle = cor;
    }
    ctx.fillText(texto, d.x, d.y);
    fim();
}

// desenha o modelo no canvas (largura em pixels; a altura segue a proporção da arte)
export async function desenharModelo(canvas, modelo, valores, fontes, largura = 1600) {
    const usadas = new Set(Object.values(fontes));
    usadas.add("Poppins");
    const itens = modelo.itens || {};
    const sprites = {};

    await Promise.all([
        ...[...usadas].map(garantirFonte),
        ...Object.keys(itens).map(async (id) => { if (itens[id].sprite) sprites[id] = await carregarArte(itens[id].sprite); })
    ]);
    const arte = await carregarArte(modelo.arte);
    const { presente, desloc } = calcularPosicoes(modelo, valores);

    canvas.width = largura;
    canvas.height = Math.round(largura * ALTURA_ARTE / LARGURA_ARTE);

    const ctx = canvas.getContext("2d");
    const escala = largura / LARGURA_ARTE;

    ctx.save();
    ctx.scale(escala, escala);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    if (arte) ctx.drawImage(arte, 0, 0, LARGURA_ARTE, ALTURA_ARTE);
    else { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, LARGURA_ARTE, ALTURA_ARTE); }

    // partes da arte que só aparecem se a informação existir (ícones, rótulos, molduras)
    Object.keys(itens).forEach((id) => {
        if (!presente[id] || !sprites[id]) return;
        const it = itens[id];
        ctx.drawImage(sprites[id], it.x + desloc[id].dx, it.y + desloc[id].dy, it.w, it.h);
    });

    // textos com a opção "igual" usam todos o MENOR tamanho que cabe
    const tamIgual = {};
    modelo.desenho.forEach((d) => {
        if (!d.igual || d.linha1 || d.paragrafo || !preenchido(valores[d.c])) return;
        const t = (d.prefixo || "") + (d.maiusc ? String(valores[d.c]).trim().toUpperCase() : String(valores[d.c]).trim());
        if ("letterSpacing" in ctx) ctx.letterSpacing = (d.esp || 0) + "px";
        const tam = ajustar(ctx, t, fontes[d.c], d.tam, d.max);
        tamIgual[d.igual] = Math.min(tamIgual[d.igual] === undefined ? Infinity : tamIgual[d.igual], tam);
    });

    modelo.desenho.forEach((d) => {
        if (d.item && !presente[d.item]) return;
        const mov = d.item ? desloc[d.item] : { dx: 0, dy: 0 };
        ctx.save();
        ctx.translate(mov.dx, mov.dy);
        desenharTexto(ctx, d, valores, fontes, tamIgual);
        ctx.restore();
    });

    ctx.restore();
}
