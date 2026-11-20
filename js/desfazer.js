// Aviso de rodapé com botão DESFAZER (ex.: depois de excluir uma tarefa).
// Uso: plannexusDesfazer("Tarefa excluída", function () { ...restaura... });
(function () {
    var barra = null, tempo = null;

    function fechar() {
        if (tempo) { clearTimeout(tempo); tempo = null; }
        if (barra) { barra.remove(); barra = null; }
    }

    window.plannexusDesfazer = function (texto, aoDesfazer) {
        fechar();
        barra = document.createElement("div");
        barra.className = "desfazer-barra";
        barra.setAttribute("role", "status");
        var span = document.createElement("span");
        span.textContent = texto;
        var botao = document.createElement("button");
        botao.type = "button";
        botao.textContent = "DESFAZER";
        botao.addEventListener("click", function () {
            botao.disabled = true;
            Promise.resolve().then(aoDesfazer).catch(function (e) { console.error(e); alert("Não foi possível desfazer."); }).then(fechar);
        });
        barra.appendChild(span);
        barra.appendChild(botao);
        document.body.appendChild(barra);
        tempo = setTimeout(fechar, 7000);
    };
})();
