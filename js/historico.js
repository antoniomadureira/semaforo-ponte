import { db, collection, query, orderBy, getDocs } from './firebase.js';

const lista = document.getElementById('lista-registos');
const displayTempo = document.getElementById('tempo-aberta-hoje');

async function atualizarHistorico() {
    const q = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    
    const hoje = new Date().setHours(0,0,0,0);
    let msTotal = 0;
    let tempoAbertura = null;

    const dados = snap.docs.map(doc => {
        const d = doc.data();
        let est = d.estado;
        if (est === "FECAHADA") est = "FECHADA"; // Correção de erros antigos

        const jsDate = d.timestamp ? d.timestamp.toDate() : new Date();
        
        // Lógica de cálculo (invertida para processar do mais antigo para o mais recente)
        if (jsDate >= hoje) {
            // Este cálculo deve ser feito num array revertido para ser linear
        }

        return { est, dataLocal: d.dataLocal, jsDate };
    });

    // Renderização
    if (lista) {
        lista.innerHTML = dados.map(r => `
            <div class="record-row">
                <div class="col-estado ${r.est === 'ABERTA' ? 'text-aberta' : (r.est === 'FECHADA' ? 'text-fechada' : 'text-preparacao')}">${r.est}</div>
                <div class="col-data">${r.dataLocal.split(' ')[0]}</div>
                <div class="col-hora">${r.dataLocal.split(' ')[1]}</div>
            </div>
        `).join('');
    }
}
atualizarHistorico();