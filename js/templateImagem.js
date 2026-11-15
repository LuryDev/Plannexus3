// ==========================================================
//  TEMPLATE DE IMAGEM  (js/templateImagem.js)
//
//  Desenha, num <canvas>, a imagem do convite e da lista de presentes.
//  Os dois usam o MESMO layout (wireframe aprovado):
//    - título no alto, à esquerda
//    - lista com traço (e uma mensagem extra opcional)
//    - rodapé "Fornecido por Plannexus - Eventos"
//    - Nexus grande, no centro da direita
//
//  O layout é desenhado num espaço de 780 x 792 e ampliado para o tamanho
//  final (1080 x 1096), por isso todas as medidas abaixo estão nesse espaço.
//
//  Para trocar o visual por um design novo, edite só este arquivo:
//  as posições e fontes estão todas em LAYOUT.
// ==========================================================

export const LARGURA = 1080;
export const ALTURA  = 1096;

const BASE_L = 780;
const BASE_A = 792;
const ESCALA = LARGURA / BASE_L;

const SANS = '"Poppins", "Segoe UI", Arial, sans-serif';

export const FUNDOS = [
    { id: "lilas",       nome: "Lilás",       cor: "#C6BFE6" },
    { id: "lilas-claro", nome: "Lilás claro", cor: "#E6DFFA" },
    { id: "branco",      nome: "Branco",      cor: "#FFFFFF" }
];

const LAYOUT = {
    moldura: 6,
    titulo:  { x: 84,  y: 68,  largura: 330, tamanho: 24, minimo: 18, peso: 600, altura: 1.3, maxLinhas: 4 },
    lista:   { x: 90,  y: 236, largura: 320, tamanho: 22, peso: 400, altura: 1.3, espaco: 6, ate: 600 },
    extra:   { tamanho: 20, margem: 14 },
    rodape:  { x: 110, y: 628, tamanho: 20, texto: "Fornecido por Plannexus - Eventos" },
    nexus:   { x: 430, y: 270, largura: 290, altura: 238 },
    nexusPequeno: { x: 600, y: 664, largura: 100, altura: 100 }
};

// ---------- utilidades ----------

// quebra o texto em linhas que cabem na largura (a fonte já deve estar aplicada)
export function quebrarTexto(ctx, texto, larguraMax) {
    const linhas = [];

    String(texto || "").split(/\n/).forEach((paragrafo) => {
        let atual = "";

        paragrafo.split(/\s+/).filter(Boolean).forEach((palavra) => {
            const teste = atual ? atual + " " + palavra : palavra;

            if (ctx.measureText(teste).width <= larguraMax || !atual) {
                atual = teste;
            } else {
                linhas.push(atual);
                atual = palavra;
            }
        });

        if (atual) linhas.push(atual);
    });

    return linhas;
}

function fonte(ctx, peso, tamanho) {
    ctx.font = `${peso} ${tamanho}px ${SANS}`;
}

// uma palavra gigante (sem espaços) é cortada para não vazar da imagem
function cortarPalavras(ctx, linhas, larguraMax) {
    return linhas.map((linha) => {
        let texto = linha;
        while (ctx.measureText(texto).width > larguraMax && texto.length > 1) {
            texto = texto.slice(0, -1);
        }
        return texto;
    });
}

// ---------- desenho ----------

// dados = {
//   titulo:  "Lista de presentes do ...",
//   itens:   ["Jogo de panelas", ...]   (cada um vira "- item")
//   extra:   "mensagem opcional" (abaixo da lista)
//   rodape:  true/false
// }
// opcoes = { fundo: "#C6BFE6", nexus: <Image> | null }
export function desenharTemplate(ctx, dados, opcoes = {}) {
    const fundo = opcoes.fundo || FUNDOS[0].cor;
    const L = LAYOUT;

    ctx.save();
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    ctx.scale(ESCALA, ESCALA);

    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

    // fundo + moldura preta
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, BASE_L, BASE_A);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = L.moldura;
    ctx.strokeRect(L.moldura / 2, L.moldura / 2, BASE_L - L.moldura, BASE_A - L.moldura);

    ctx.fillStyle = "#111111";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // título (diminui a fonte se for comprido)
    let tamTitulo = L.titulo.tamanho;
    let linhasTitulo = [];
    for (; tamTitulo >= L.titulo.minimo; tamTitulo -= 1) {
        fonte(ctx, L.titulo.peso, tamTitulo);
        linhasTitulo = quebrarTexto(ctx, dados.titulo, L.titulo.largura);
        if (linhasTitulo.length <= L.titulo.maxLinhas) break;
    }
    tamTitulo = Math.max(tamTitulo, L.titulo.minimo);
    fonte(ctx, L.titulo.peso, tamTitulo);
    linhasTitulo = cortarPalavras(ctx, linhasTitulo.slice(0, L.titulo.maxLinhas), L.titulo.largura);
    linhasTitulo.forEach((linha, i) => {
        ctx.fillText(linha, L.titulo.x, L.titulo.y + i * tamTitulo * L.titulo.altura);
    });

    // lista com traço
    const itens = (dados.itens || []).map((t) => "- " + String(t).trim()).filter((t) => t.length > 2);

    // Distribui os itens em colunas: cada item vira um bloco de linhas e, quando a
    // coluna enche, segue para a próxima. Devolve as colunas e quantos itens sobraram.
    function distribuir(tam, larguraCol, numColunas, limiteY) {
        fonte(ctx, L.lista.peso, tam);
        const lh = tam * L.lista.altura;
        const colunas = Array.from({ length: numColunas }, () => ({ linhas: [], y: 0 }));
        let atual = 0;
        let colocados = 0;

        for (const item of itens) {
            const linhas = cortarPalavras(ctx, quebrarTexto(ctx, item, larguraCol), larguraCol);
            const alturaItem = linhas.length * lh + L.lista.espaco;

            if (colunas[atual].y + alturaItem > limiteY) {
                if (atual + 1 >= numColunas) break;
                atual += 1;
            }

            colunas[atual].linhas.push(...linhas.map((l, k) => ({ l, y: colunas[atual].y + k * lh })));
            colunas[atual].y += alturaItem;
            colocados += 1;
        }

        return { colunas, lh, sobraram: itens.length - colocados };
    }

    const limiteLista = L.lista.ate - L.lista.y - (dados.extra ? 70 : 0);
    let tam = L.lista.tamanho;
    let modo = { colunas: 1, largura: L.lista.largura, minimo: 18 };
    let resultado = null;

    // 1º: coluna estreita ao lado do Nexus grande, sem diminuir demais a letra
    for (tam = L.lista.tamanho; tam >= modo.minimo; tam -= 1) {
        resultado = distribuir(tam, modo.largura, modo.colunas, limiteLista);
        if (resultado.sobraram === 0) break;
    }

    let compacto = false;

    // 2º: lista grande -> duas colunas na largura toda e Nexus pequeno no canto
    if (resultado.sobraram > 0) {
        compacto = true;
        modo = { colunas: 2, largura: 292, minimo: 14 };
        for (tam = 19; tam >= modo.minimo; tam -= 1) {
            resultado = distribuir(tam, modo.largura, modo.colunas, limiteLista);
            if (resultado.sobraram === 0) break;
        }
    }

    // ainda não coube: avisa quantos ficaram de fora
    const aviso = resultado.sobraram > 0 ? "... e mais " + resultado.sobraram : "";

    fonte(ctx, L.lista.peso, tam);
    let fimY = L.lista.y;
    resultado.colunas.forEach((coluna, c) => {
        const x = L.lista.x + c * (modo.largura + 24);
        coluna.linhas.forEach((linha) => ctx.fillText(linha.l, x, L.lista.y + linha.y));
        fimY = Math.max(fimY, L.lista.y + coluna.y);
    });

    if (aviso) {
        const ultima = resultado.colunas[resultado.colunas.length - 1];
        const x = L.lista.x + (resultado.colunas.length - 1) * (modo.largura + 24);
        ctx.fillText(aviso, x, Math.min(L.lista.y + ultima.y, L.lista.ate));
    }

    // mensagem extra (convite)
    if (dados.extra) {
        fonte(ctx, 400, L.extra.tamanho);
        const linhasExtra = cortarPalavras(ctx, quebrarTexto(ctx, dados.extra, L.lista.largura), L.lista.largura).slice(0, 4);
        const yExtra = fimY - L.lista.espaco + L.extra.margem;
        linhasExtra.forEach((linha, i) => ctx.fillText(linha, L.lista.x, yExtra + i * L.extra.tamanho * 1.3));
    }

    // rodapé
    if (dados.rodape !== false) {
        fonte(ctx, 400, L.rodape.tamanho);
        ctx.fillText(L.rodape.texto, L.rodape.x, L.rodape.y);
    }

    // Nexus: grande no centro da direita (ou pequeno no canto quando a lista é grande)
    if (opcoes.nexus) {
        const img = opcoes.nexus;
        const caixa = compacto ? L.nexusPequeno : L.nexus;
        const proporcao = img.width / img.height;
        let w = caixa.largura;
        let h = w / proporcao;

        if (h > caixa.altura) {
            h = caixa.altura;
            w = h * proporcao;
        }

        ctx.drawImage(
            img,
            caixa.x + (caixa.largura - w) / 2,
            caixa.y + (caixa.altura - h) / 2,
            w,
            h
        );
    }

    ctx.restore();
}

// ---------- imagens e fontes (só no navegador) ----------

export function carregarImagem(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);   // sem a imagem, o template sai sem o Nexus
        img.src = src;
    });
}

export async function carregarFontes() {
    try {
        await Promise.all([
            document.fonts.load('400 22px "Poppins"'),
            document.fonts.load('600 24px "Poppins"')
        ]);
    } catch (e) {
        console.warn("Não foi possível pré-carregar as fontes:", e);
    }
}

// ---------- textos prontos ----------

// "2026-11-15" -> "sábado, 15 de novembro de 2026"
export function dataPorExtenso(iso) {
    const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(iso || "");

    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// "19:30" -> "às 19h30"   |   "19:00" -> "às 19h"
export function horarioPorExtenso(hhmm) {
    const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return String(hhmm || "");
    return "às " + Number(m[1]) + "h" + (m[2] === "00" ? "" : m[2]);
}

export function tituloPadraoConvite(evento) {
    return "Você está convidado(a) para " + ((evento && evento.nome) || "o evento") + "!";
}

export function tituloListaPresentes(evento) {
    return "Lista de presentes do " + ((evento && evento.nome) || "evento") + "!";
}

// ---------- texto que acompanha a imagem ao compartilhar ----------

export const LINK_PLANNEXUS = "https://plannexus.vercel.app";

export function textoCompartilharLista(evento) {
    const nome = (evento && evento.nome) ? " do " + evento.nome : " do meu evento";
    return "🎁 Olha a lista de presentes" + nome + "! Dá uma olhada e escolha o seu. 💜\n\n" +
           "Quer organizar seus próprios eventos? Conheça o Plannexus: " + LINK_PLANNEXUS;
}

export function textoCompartilharConvite(evento) {
    const nome = (evento && evento.nome) ? evento.nome : "o meu evento";
    return "🎉 Você é meu convidado(a) para " + nome + "! Veja os detalhes na imagem. 💜\n\n" +
           "Organize seus próprios eventos com o Plannexus: " + LINK_PLANNEXUS;
}
