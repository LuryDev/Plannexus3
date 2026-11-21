// Botão "Mostrar/Ocultar" dos campos de senha (login e cadastro)
document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".ver") : null;
    if (!b) return;
    var i = document.getElementById(b.getAttribute("data-v"));
    if (!i) return;
    var oculto = i.type === "password";
    i.type = oculto ? "text" : "password";
    b.textContent = oculto ? "Ocultar" : "Mostrar";
});
