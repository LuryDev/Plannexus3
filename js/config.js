// ==========================================================
//  CONFIGURAÇÃO DO FIREBASE — ÚNICO LUGAR COM AS CHAVES
//  Carregado em todas as páginas com <script src="js/config.js">
//  (script normal, então funciona até abrindo o HTML direto do arquivo)
// ==========================================================

var FIREBASE_CONFIG = {
    apiKey: "AIzaSyBYBqc50k0zHEaApVPPRmzkFWJe-TczAdI",
    authDomain: "plannexus-def4c.firebaseapp.com",
    projectId: "plannexus-def4c",
    storageBucket: "plannexus-def4c.firebasestorage.app",
    messagingSenderId: "1087555797090",
    appId: "1:1087555797090:web:ab7707890e610e80c8d13b",
    measurementId: "G-0FGX8KENV1"
};

// Chave pública das notificações push (Firebase > Configurações do projeto >
// Cloud Messaging > Certificados push da Web > Gerar par de chaves).
// Enquanto estiver vazia, o app funciona normalmente, só sem push.
// Aviso de atualização do app: quem usa o app da Play Store com versão MENOR que esta
// vê o aviso na tela principal. É o versionCode do AAB (o mesmo número do "?app=" da
// URL de início do app no PWABuilder). Para pedir nova atualização, aumente e publique.
var VERSAO_MINIMA_APP = 7;

var VAPID_KEY = "BB58CoNAQlDCu68tTGPnde2mss3VSgLhazVmvP5GvzzFmy_6KgoWgM87yai4SOxmiEn6qoR6OEaLWTSvqmX61tE";

// E-mail da conta de administrador
var EMAIL_ADMIN = "admin@plannexus.com";
