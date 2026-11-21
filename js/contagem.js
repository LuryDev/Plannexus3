/* Contagem regressiva do evento principal.
   Uso: plannexusContagem.iniciar(elementoCaixa, "2027-03-03", "17:00")
   Só mostra ano/mês/dia quando já são necessários; horas, min e seg sempre. */
(function () {
    var timer = null;

    function somarMeses(base, n) {
        var alvo = new Date(base.getFullYear(), base.getMonth() + n, 1, base.getHours(), base.getMinutes(), base.getSeconds());
        var dias = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
        alvo.setDate(Math.min(base.getDate(), dias));
        return alvo;
    }

    function restante(agora, alvo) {
        var meses = (alvo.getFullYear() - agora.getFullYear()) * 12 + (alvo.getMonth() - agora.getMonth());
        while (meses > 0 && somarMeses(agora, meses) > alvo) meses--;
        var seg = Math.floor(Math.max(0, alvo - somarMeses(agora, meses)) / 1000);
        return [
            [Math.floor(meses / 12), "ano", "anos"],
            [meses % 12, "mês", "meses"],
            [Math.floor(seg / 86400), "dia", "dias"],
            [Math.floor((seg % 86400) / 3600), "hora", "horas"],
            [Math.floor((seg % 3600) / 60), "min", "min"],
            [seg % 60, "seg", "seg"]
        ];
    }

    function alvoDe(data, horario) {
        var p = String(data || "").split("-");
        var br = String(data || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (br) p = [br[3], br[2], br[1]];
        if (p.length !== 3) return null;
        var hm = /^(\d{1,2}):(\d{2})/.exec(horario || "");
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), hm ? Number(hm[1]) : 0, hm ? Number(hm[2]) : 0, 0);
        return isNaN(d.getTime()) ? null : { data: d, semHora: !hm };
    }

    function iniciar(caixa, data, horario) {
        clearInterval(timer);
        var tempo = caixa.querySelector(".ct-tempo");
        var alvo = alvoDe(data, horario);
        if (!alvo) { caixa.hidden = true; return; }
        caixa.hidden = false;

        function tique() {
            var agora = new Date();
            var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
            var ehHoje = alvo.data.getFullYear() === hoje.getFullYear() && alvo.data.getMonth() === hoje.getMonth() && alvo.data.getDate() === hoje.getDate();

            if (alvo.semHora && ehHoje) { tempo.innerHTML = '<span class="ct-msg">É hoje!</span>'; return; }
            if (agora >= alvo.data) {
                tempo.innerHTML = '<span class="ct-msg">' + (ehHoje ? "É agora! 🎉" : "O evento já aconteceu") + '</span>';
                clearInterval(timer);
                return;
            }
            var u = restante(agora, alvo.data), i = 0;
            while (i < u.length - 2 && u[i][0] === 0) i++;
            tempo.innerHTML = u.slice(i).map(function (x) {
                return '<div class="ct-un"><strong>' + String(x[0]).padStart(2, "0") + '</strong><span>' + (x[0] === 1 ? x[1] : x[2]) + '</span></div>';
            }).join("");
        }
        tique();
        timer = setInterval(tique, 1000);
    }

    window.plannexusContagem = { iniciar: iniciar };
})();
