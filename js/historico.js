import { db, collection, query, orderBy, getDocs, onSnapshot, limit } from './firebase.js';

const listaRegistos = document.getElementById('lista-registos');
const btnExportar = document.getElementById('btn-exportar');
const textoEstadoAtual = document.getElementById('texto-estado-atual');
const displayTempoAberta = document.getElementById('tempo-aberta-hoje');
const filtroEstado = document.getElementById('filtro-estado');

let todosOsRegistos = [];
let cronometroAbertaHoje = null;

const queryAtual = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"), limit(1));
onSnapshot(queryAtual, (snapshot) => {
    snapshot.forEach((doc) => {
        const estado = doc.data().estado;
        if (estado === "ABERTA") textoEstadoAtual.innerText = "PONTE ABERTA - TRÂNSITO CORTADO";
        else if (estado === "FECHADA") textoEstadoAtual.innerText = "PONTE FECHADA - TRÂNSITO LIVRE";
        else if (estado === "EM PREPARAÇÃO") textoEstadoAtual.innerText = "PONTE EM PREPARAÇÃO";
    });
});

async function carregarHistorico() {
    listaRegistos.innerHTML = '<div class="loading-text">A carregar...</div>';
    try {
        const q = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        todosOsRegistos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if(data.timestamp) {
                todosOsRegistos.push({
                    id: doc.id,
                    estado: data.estado,
                    dataLocal: data.dataLocal,
                    jsDate: data.timestamp.toDate() 
                });
            }
        });
        renderizarTabela(todosOsRegistos);
        calcularTempoAbertaHoje();
    } catch (erro) {
        listaRegistos.innerHTML = '<div class="loading-text">Erro ao carregar dados.</div>';
    }
}

function renderizarTabela(registos) {
    listaRegistos.innerHTML = "";
    if (registos.length === 0) {
        listaRegistos.innerHTML = '<div class="loading-text">Sem registos.</div>';
        return;
    }

    registos.forEach(reg => {
        const partes = reg.dataLocal.replace(',', '').split(" ");
        const dataStr = partes[0] || "--";
        const horaStr = partes[1] || "--";

        let classeCor = "";
        if (reg.estado === "FECHADA") classeCor = "text-fechada";
        else if (reg.estado === "ABERTA") classeCor = "text-aberta";
        else if (reg.estado === "EM PREPARAÇÃO") classeCor = "text-preparacao";

        const linha = document.createElement('div');
        linha.className = 'record-row';
        linha.innerHTML = `
            <div class="col-estado ${classeCor}">${reg.estado}</div>
            <div class="col-data">${dataStr}</div>
            <div class="col-hora">${horaStr}</div>
        `;
        listaRegistos.appendChild(linha);
    });
}

function calcularTempoAbertaHoje() {
    const inicioDeHoje = new Date();
    inicioDeHoje.setHours(0, 0, 0, 0);
    const registosHoje = todosOsRegistos
        .filter(r => r.jsDate >= inicioDeHoje)
        .sort((a, b) => a.jsDate - b.jsDate);

    let tempoTotalMs = 0;
    let timestampAbertura = null;

    registosHoje.forEach(reg => {
        if (reg.estado === "ABERTA" && !timestampAbertura) timestampAbertura = reg.jsDate.getTime();
        else if ((reg.estado === "FECHADA" || reg.estado === "EM PREPARAÇÃO") && timestampAbertura) {
            tempoTotalMs += (reg.jsDate.getTime() - timestampAbertura);
            timestampAbertura = null; 
        }
    });

    if (cronometroAbertaHoje) clearInterval(cronometroAbertaHoje);
    if (timestampAbertura !== null) {
        cronometroAbertaHoje = setInterval(() => {
            displayTempoAberta.innerText = formatarMsParaHHMMSS(tempoTotalMs + (Date.now() - timestampAbertura));
        }, 1000);
    } else {
        displayTempoAberta.innerText = formatarMsParaHHMMSS(tempoTotalMs);
    }
}

function formatarMsParaHHMMSS(ms) {
    if (ms <= 0) return "00:00:00";
    let segundos = Math.floor((ms / 1000) % 60);
    let minutos = Math.floor((ms / (1000 * 60)) % 60);
    let horas = Math.floor((ms / (1000 * 60 * 60)));
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
}

btnExportar.addEventListener('click', () => {
    let csvContent = "\uFEFFESTADO;DATA E HORA\n";
    todosOsRegistos.forEach(row => { csvContent += `${row.estado};${row.dataLocal}\n`; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico_ponte.csv`;
    link.click();
});

filtroEstado.addEventListener('change', (e) => {
    const val = e.target.value;
    renderizarTabela(val === 'todos' ? todosOsRegistos : todosOsRegistos.filter(r => r.estado === val));
});

carregarHistorico();