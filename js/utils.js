// ==========================================================
//  FUNÇÕES AUXILIARES USADAS EM VÁRIAS PÁGINAS
//  Carregado com <script src="js/utils.js"> (script normal)
// ==========================================================

// Pega o ?id=... da URL (id do evento)
function pegarIdDaUrl() {
    return new URLSearchParams(window.location.search).get("id");
}

// Evita que um texto digitado pelo usuário vire HTML na página
function escaparHTML(texto) {
    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// "2026-07-15" -> "15/07/2026"  (se já vier em outro formato, devolve como está)
function formatarData(data) {
    if (!data) return "";
    const partes = String(data).split("-");
    if (partes.length === 3 && partes[0].length === 4) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return String(data);
}

// Transforma a data em algo que dá para ordenar ("15/07/2026" ou "2026-07-15" -> "2026-07-15")
function dataParaOrdenar(data) {
    if (!data) return "9999-99-99";
    const texto = String(data);
    const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return texto;
}

// Data de hoje no formato do <input type="date"> ("2026-10-06")
function hojeISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
}

// Espera o Firebase dizer quem está logado; se ninguém estiver, vai para o login.
// Uso:  const usuario = await exigirLogin(auth, onAuthStateChanged);
function exigirLogin(auth, onAuthStateChanged) {
    return new Promise(function (resolve) {
        const parar = onAuthStateChanged(auth, function (usuario) {
            parar();
            if (usuario) {
                resolve(usuario);
            } else {
                window.location.href = "login.html";
            }
        });
    });
}


// Selo "Plannexus oferece esse serviço!": só aparece se a tarefa realmente fala de uma ferramenta que o app tem.
// (mesma lista em api/nexus.js; confere também tarefas antigas que a IA marcou errado)
var SERVICO_PALAVRAS = {
    presentes:  /presente/i,
    financeiro: /or[çc]amento|gasto|despesa|custo|financ|verba|receita/i,
    calendario: /\bdata\b|prazo|calend[áa]rio|agenda|cronograma|compromisso/i,
    notas:      /anota|\bideias?\b|\bnotas?\b|brainstorm/i,
    pessoas:    /ajud|colabor|equipe|respons[áa]ve|dividir|delegar/i,
    convidados: /convidad|confirma[çc][ãa]o de presen|\brsvp\b/i,
    convites:   /convite/i
};

function servicoDaTarefa(tarefa) {
    if (!tarefa || !tarefa.servico || !SERVICO_PALAVRAS[tarefa.servico]) return "";
    return SERVICO_PALAVRAS[tarefa.servico].test(String(tarefa.titulo || "")) ? tarefa.servico : "";
}

// Páginas das ferramentas que o selo leva (todas recebem ?id=ID_DO_EVENTO)
var SERVICO_PAGINAS = {
    presentes: "presentes.html",
    financeiro: "controleFinanceiro.html",
    calendario: "calendario.html",
    notas: "blocoNotas.html",
    pessoas: "pessoas.html",
    convidados: "convidados.html",
    convites: "convite.html"
};

function irParaServico(evento, el) {
    evento.preventDefault();
    evento.stopPropagation();
    window.location.href = el.getAttribute("data-ir");
}

// Selo "Organize com Plannexus!": clicável (leva à ferramenta) quando já existe o evento.
function seloDoServico(tarefa, eventoId) {
    var servico = servicoDaTarefa(tarefa);
    if (!servico) return "";
    var texto = '<i class="fa-solid fa-circle-check"></i> Organize com Plannexus!';
    if (!eventoId || !SERVICO_PAGINAS[servico]) return '<small class="selo-servico">' + texto + '</small>';
    var url = SERVICO_PAGINAS[servico] + "?id=" + encodeURIComponent(eventoId);
    return '<small class="selo-servico selo-link" role="link" tabindex="0" data-ir="' + url + '"' +
        ' onclick="irParaServico(event, this)"' +
        ' onkeydown="if (event.key === \'Enter\' || event.key === \' \') irParaServico(event, this)">' + texto + '</small>';
}
