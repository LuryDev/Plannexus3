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
