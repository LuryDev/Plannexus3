// ==========================================================
//  VERSÃO DO APP INSTALADO  (js/versaoApp.js)
//
//  Roda bem no começo (index.html e inicio.html). Quando a página é aberta
//  pelo aplicativo da Play Store, o Android informa isso no "referrer"
//  (android-app://com.lurydev.plannexus). Nessa hora guardamos:
//     - que este aparelho usa o app instalado          (ehAppInstalado = "1")
//     - qual versão do app é, vinda da URL de início   (versaoApp = número)
//
//  A URL de início do app é definida no PWABuilder ao gerar o AAB:
//     /?app=4      (o número é o versionCode do AAB)
//  Apps antigos abrem sem esse "?app=", então ficam com versão 0.
//
//  Só atualiza quando o referrer é o do app (a abertura do app). Em qualquer
//  outra navegação, mantém o que já estava guardado.
// ==========================================================
(function () {
    try {
        var referrer = document.referrer || "";

        if (referrer.indexOf("android-app://com.lurydev.plannexus") !== 0) return;

        var parametro = new URLSearchParams(window.location.search).get("app");
        var versao = parseInt(parametro, 10);

        localStorage.setItem("ehAppInstalado", "1");
        localStorage.setItem("versaoApp", String(isFinite(versao) && versao > 0 ? versao : 0));
    } catch (e) {
        /* sem localStorage: segue sem o aviso */
    }
})();
