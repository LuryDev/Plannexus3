import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { GetFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const app = initializeApp (FIREBASE_CONFIG);
const auth = getAuth (app);
const firestore = getFirestore (app);

const nomeEvento = document.getElementById ("nomeEvento");
const lista = document.getElementById ("listaCompromissos");
const botaoNovo = document.getElementById ("botaoNovo");
const modal = document.getElementById ("modal");

async function iniciar() {
    try {
        const usuario = await exigirLogin(auth, onAuthStateChanged);

        const eventoId = pegarIdDaUrl();

        if (!eventoId) {
            nomeEvento.textContent = "Evento não informado";
            return;
        }

        const referenciaEvento = doc(
            firestore,
            "eventos",
            eventoId
        );

        const resultado = await getDoc(referenciaEvento);

        if (!resultado.exists()) {
            nomeEvento.textContent = "Evento não encontrado";
            return;
        }

        const evento = resultado.data();

        nomeEvento.textContent = evento.nome ?? "Meu evento";

    } catch (erro) {
        console.error("Erro ao carregar o evento:", erro);
        nomeEvento.textContent = "Não foi possível carregar o evento";
    }
}

iniciar();
