/**
 * MONITOR - PONTE MÓVEL MATOSINHOS
 * Versão Estabilizada - CGIU
 */

// 1. INICIALIZAÇÃO IMEDIATA DO RELÓGIO (Não depende de nada)
const iniciarRelogio = () => {
    const display = document.getElementById('timestamp-atual');
    const tick = () => {
        if (display) {
            const agora = new Date();
            display.innerText = agora.toLocaleTimeString('pt-PT');
        }
    };
    tick();
    setInterval(tick, 1000);
};
iniciarRelogio();

// 2. IMPORTAÇÕES (Pode falhar se o firebase.js estiver incorreto)
import { db, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from './firebase.js';

const textoEstado = document.getElementById('texto-estado');
const luzes = {
    RED: document.getElementById('light-red'),
    YELLOW: document.getElementById('light-yellow'),
    GREEN: document.getElementById('light-green')
};

let ultimoEstado = null;
let dbPronta = false;

// 3. ESCUTA EM TEMPO REAL (FIREBASE)
const q = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"), limit(1));

onSnapshot(q, (snapshot) => {
    dbPronta = true;
    if (snapshot.empty) return;

    snapshot.forEach((doc) => {
        const estado = doc.data().estado;
        ultimoEstado = estado;

        // Reset Visual
        Object.values(luzes).forEach(l => l?.classList.remove('red-active', 'yellow-active', 'green-active'));

        if (estado === "ABERTA") {
            textoEstado.innerText = "PONTE ABERTA - TRÂNSITO CORTADO";
            luzes.RED?.classList.add('red-active');
        } else if (estado === "FECHADA") {
            textoEstado.innerText = "PONTE FECHADA - TRÂNSITO LIVRE";
            luzes.GREEN?.classList.add('green-active');
        } else if (estado === "EM PREPARAÇÃO") {
            textoEstado.innerText = "PONTE EM PREPARAÇÃO";
            luzes.YELLOW?.classList.add('yellow-active');
        }
    });
}, (err) => console.error("Erro Firebase:", err));

// 4. VERIFICAÇÃO APDL (Com tratamento de erro CORS/500)
async function verificarAPDL() {
    if (!dbPronta) return;

    try {
        // Usamos um timestamp para evitar caches do proxy que causam o erro 500
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/?t=' + Date.now())}`;
        
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Proxy instável");

        const data = await res.json();
        const html = data.contents.toLowerCase();
        let detectado = "DESCONHECIDO";

        if (html.includes("em trânsito") || html.includes("transito")) detectado = "FECHADA";
        else if (html.includes("interrompido") || html.includes("manobra")) detectado = "ABERTA";
        else if (html.includes("preparação") || html.includes("preparacao")) detectado = "EM PREPARAÇÃO";

        if (detectado !== "DESCONHECIDO" && detectado !== ultimoEstado) {
            await addDoc(collection(db, "registos_ponte"), {
                estado: detectado,
                timestamp: serverTimestamp(),
                dataLocal: new Date().toLocaleString('pt-PT').replace(',', '')
            });
        }
    } catch (e) {
        // Silencioso para não poluir a consola, o relógio continua a contar
        console.warn("APDL inacessível temporariamente...");
    }
}

setInterval(verificarAPDL, 20000); // 20 segundos para evitar bloqueios de IP