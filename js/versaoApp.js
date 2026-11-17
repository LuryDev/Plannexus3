// ==========================================================
//  VERSÃO DO APP INSTALADO  (js/versaoApp.js)
//
//  Roda bem no começo (index.html e inicio.html). Guarda:
//     - ehAppInstalado = "1"  -> este aparelho usa o app da Play Store
//     - versaoApp = número    -> vem da URL de início do AAB (/?app=N)
//
//  Regras (a versão guardada NUNCA diminui):
//   1) Se a URL tem ?app=N, é o app: guarda max(guardado, N), mesmo que o
//      Android não informe o referrer (acontece ao tocar em "Abrir" na loja).
//   2) Sem ?app=, mas com referrer android-app://...: é o app antigo (ou uma
//      abertura por notificação). Só grava 0 se ainda não havia nada guardado.
//   3) Qualquer outra situação: não mexe.
// ==========================================================
(function () {
    try {
        var params = new URLSearchParams(window.location.search);
        var versao = parseInt(params.get("app"), 10);
        var temVersao = isFinite(versao) && versao > 0;
        var doApp = (document.referrer || "").indexOf("android-app://com.lurydev.plannexus") === 0;

        if (!temVersao && !doApp) return;

        var guardada = parseInt(localStorage.getItem("versaoApp"), 10);
        var temGuardada = isFinite(guardada);

        localStorage.setItem("ehAppInstalado", "1");

        if (temVersao) {
            localStorage.setItem("versaoApp", String(temGuardada ? Math.max(guardada, versao) : versao));
        } else if (!temGuardada) {
            localStorage.setItem("versaoApp", "0");
        }
    } catch (e) {
        /* sem localStorage: segue sem o aviso */
    }
})();
