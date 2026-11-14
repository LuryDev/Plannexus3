// ==========================================================
//  ÍCONE DE CADA TIPO DE EVENTO (Font Awesome)
//  Carregado com <script src="js/icones.js"> (script normal)
// ==========================================================

const ICONES_EVENTO = {
    "Casamento": "fa-heart",
    "Aniversário": "fa-cake-candles",
    "Formatura": "fa-graduation-cap",
    "Evento Corporativo": "fa-briefcase",
    "Chá de Bebê": "fa-baby",
    "Outro": "fa-star"
};

// "Casamento" -> "fa-solid fa-heart"  (tipo desconhecido/antigo -> calendário)
function iconeDoEvento(categoria) {
    return "fa-solid " + (ICONES_EVENTO[categoria] || "fa-calendar-days");
}
