import { db, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from './firebase.js';

const textoEstado = document.getElementById('texto-estado');
const luzVermelha = document.getElementById('light-red');
const luzAmarela = document.getElementById('light-yellow');
const luzVerde = document.getElementById('light-green');

let ultimoEstadoGravado = null;
let baseDeDadosSincronizada = false;

// 1. ATUALIZAÇÃO VISUAL (Sincronizada com Firebase)
const q = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"), limit(1));
onSnapshot(q, (snapshot) => {
    baseDeDadosSincronizada = true;
    if (snapshot.empty) return;

    snapshot.forEach((doc) => {
        const dados = doc.data();
        ultimoEstadoGravado = dados.estado;

        // Reset luzes
        [luzVermelha, luzAmarela, luzVerde].forEach(l => l?.classList.remove('red-active', 'yellow-active', 'green-active'));

        if (dados.estado === "ABERTA") {
            textoEstado.innerText = "PONTE ABERTA - TRÂNSITO CORTADO";
            luzVermelha?.classList.add('red-active');
        } else if (dados.estado === "FECHADA") {
            textoEstado.innerText = "PONTE FECHADA - TRÂNSITO LIVRE";
            luzVerde?.classList.add('green-active');
        } else if (dados.estado === "EM PREPARAÇÃO") {
            textoEstado.innerText = "PONTE EM PREPARAÇÃO";
            luzAmarela?.classList.add('yellow-active');
        }
    });
});

// 2. LEITURA DA APDL (Com Filtro de Incongruências)
async function verificarAPDL() {
    if (!baseDeDadosSincronizada) return;

    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/')}`;
        const resposta = await fetch(proxyUrl);
        const dadosJSON = await resposta.json();
        const textoDaPagina = dadosJSON.contents.toLowerCase();
        
        let estadoDetectado = "DESCONHECIDO";

        // Lógica de tradução rigorosa
        if (textoDaPagina.includes("em trânsito") || textoDaPagina.includes("transito")) {
            estadoDetectado = "FECHADA";
        } else if (textoDaPagina.includes("interrompido") || textoDaPagina.includes("manobra")) {
            estadoDetectado = "ABERTA";
        } else if (textoDaPagina.includes("preparação") || textoDaPagina.includes("preparacao")) {
            estadoDetectado = "EM PREPARAÇÃO";
        }

        // SÓ GRAVA SE: Estado for conhecido E diferente do último E houver estabilidade
        if (estadoDetectado !== "DESCONHECIDO" && estadoDetectado !== ultimoEstadoGravado) {
            console.log(`📢 Mudança Real Detetada: ${estadoDetectado}`);
            await addDoc(collection(db, "registos_ponte"), {
                estado: estadoDetectado,
                timestamp: serverTimestamp(),
                dataLocal: new Date().toLocaleString('pt-PT').replace(',', '')
            });
            ultimoEstadoGravado = estadoDetectado;
        }
    } catch (e) {
        console.error("Erro APDL:", e.message);
    }
}

setInterval(verificarAPDL, 15000);
setTimeout(verificarAPDL, 30000);