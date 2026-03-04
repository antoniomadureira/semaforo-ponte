import { db, collection, query, orderBy, getDocs, limit } from './firebase.js';

const lista = document.getElementById('lista-registos');
const btnExportar = document.getElementById('btn-exportar');
const filtroEstado = document.getElementById('filtro-estado');
const displayTempoHoje = document.getElementById('tempo-aberta-hoje');
const textoEstadoAtual = document.getElementById('texto-estado-atual');

let dadosGlobais = [];
let chartDiarioInstance = null;
let chartMensalInstance = null;

// Converte minutos (ex: 75) para "01:15"
const formatarMinutosParaHora = (minutos) => {
    if (!minutos || minutos < 0) return "00:00";
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

async function atualizarHistorico() {
    try {
        // Busca os dados (Limitado a 2000 para manter a velocidade de rede)
        const q = query(collection(db, "registos_ponte"), orderBy("timestamp", "desc"), limit(2000));
        const snap = await getDocs(q);
        
        dadosGlobais = snap.docs.map(doc => {
            const d = doc.data();
            // Limpeza: removemos vírgulas da string de data para não corromper o CSV
            const dataLimpa = (d.dataLocal || "").replace(/,/g, '');
            return { 
                est: d.estado === "FECAHADA" ? "FECHADA" : d.estado, 
                dataLocal: dataLimpa, 
                jsDate: d.timestamp ? d.timestamp.toDate() : new Date() 
            };
        });

        // Atualiza imediatamente o estado para remover o "A SINCRONIZAR..."
        if (dadosGlobais.length > 0 && textoEstadoAtual) {
            textoEstadoAtual.innerText = `ESTADO ATUAL: ${dadosGlobais[0].est}`;
        }

        renderizarTabela(dadosGlobais.slice(0, 100)); // Apenas 100 na tabela para rapidez visual
        processarEPintarDados(dadosGlobais);
        
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
    }
}

function renderizarTabela(dados) {
    if (!lista) return;
    lista.innerHTML = dados.map(r => `
        <div class="record-row">
            <div class="col-estado ${r.est === 'ABERTA' ? 'text-aberta' : (r.est === 'FECHADA' ? 'text-fechada' : 'text-preparacao')}">${r.est}</div>
            <div class="col-data">${r.dataLocal.split(/\s+/)[0]}</div>
            <div class="col-hora">${r.dataLocal.split(/\s+/)[1] || ""}</div>
        </div>
    `).join('');
}

function processarEPintarDados(dados) {
    const cronologico = [...dados].reverse();
    const hojeStr = new Date().toLocaleDateString('pt-PT');
    const mesIdx = new Date().getMonth();
    const ano = new Date().getFullYear();

    let msHoje = 0;
    let minHoraHoje = Array(24).fill(0);
    let minDiaMes = {};
    let inicio = null;

    cronologico.forEach(d => {
        if (d.est === "ABERTA") inicio = d.jsDate;
        else if (d.est === "FECHADA" && inicio) {
            const diff = d.jsDate - inicio;
            const diffMin = diff / 60000;
            if (inicio.toLocaleDateString('pt-PT') === hojeStr) {
                msHoje += diff;
                minHoraHoje[inicio.getHours()] += diffMin;
            }
            if (inicio.getMonth() === mesIdx && inicio.getFullYear() === ano) {
                const dia = inicio.getDate().toString().padStart(2, '0');
                minDiaMes[dia] = (minDiaMes[dia] || 0) + diffMin;
            }
            inicio = null;
        }
    });

    if (displayTempoHoje) {
        const s = Math.floor(msHoje / 1000);
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const seg = (s % 60).toString().padStart(2, '0');
        displayTempoHoje.innerText = `${h}:${m}:${seg}`;
    }
    desenharGraficos(minHoraHoje, minDiaMes);
}

function desenharGraficos(dDiarios, dMensais) {
    if (!window.Chart) return;
    const configBase = {
        responsive: true,
        plugins: { 
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `Duração: ${formatarMinutosParaHora(ctx.raw)}` } }
        },
        scales: {
            y: { 
                ticks: { 
                    color: '#a1a1aa', 
                    stepSize: 30, // Intervalos de 30 min
                    callback: (v) => formatarMinutosParaHora(v) 
                }, 
                grid: { color: '#27272a' } 
            },
            x: { ticks: { color: '#a1a1aa' }, grid: { display: false } }
        }
    };

    if (chartDiarioInstance) chartDiarioInstance.destroy();
    chartDiarioInstance = new Chart(document.getElementById('chartDiario'), {
        type: 'bar',
        data: { labels: Array.from({length: 24}, (_, i) => `${i}h`), datasets: [{ data: dDiarios, backgroundColor: '#dc2626' }] },
        options: { ...configBase, plugins: { ...configBase.plugins, title: { display: true, text: 'Hoje (HH:MM)', color: '#a1a1aa' } } }
    });

    const totalDias = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const labelsM = Array.from({length: totalDias}, (_, i) => (i + 1).toString().padStart(2, '0'));
    if (chartMensalInstance) chartMensalInstance.destroy();
    chartMensalInstance = new Chart(document.getElementById('chartMensal'), {
        type: 'bar',
        data: { labels: labelsM, datasets: [{ data: labelsM.map(d => dMensais[d] || 0), backgroundColor: '#eab308' }] },
        options: { ...configBase, plugins: { ...configBase.plugins, title: { display: true, text: 'Mensal (HH:MM)', color: '#a1a1aa' } } }
    });
}

// DOWNLOAD INSTANTÂNEO
if (btnExportar) {
    btnExportar.addEventListener('click', () => {
        const val = filtroEstado.value;
        const filtrados = val === "todos" ? dadosGlobais : dadosGlobais.filter(d => d.est === val);

        if (filtrados.length === 0) return;

        // Geramos o conteúdo CSV (sem vírgulas internas nos dados)
        const csvRows = ["Estado,Data,Hora"];
        for (let i = 0; i < filtrados.length; i++) {
            const r = filtrados[i];
            const partes = r.dataLocal.split(/\s+/);
            csvRows.push(`${r.est},${partes[0]},${partes[1] || ""}`);
        }

        const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `historico_ponte_${val}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    });
}

if (filtroEstado) {
    filtroEstado.addEventListener('change', (e) => {
        const val = e.target.value;
        const filtrados = val === "todos" ? dadosGlobais : dadosGlobais.filter(d => d.est === val);
        renderizarTabela(filtrados.slice(0, 100));
    });
}

atualizarHistorico();