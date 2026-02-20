import { useState, useEffect, useRef } from 'react';

// Variáveis de ambiente configuradas no GitHub Secrets
const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

interface LogEntrada {
  estado: string;
  data: string;
  hora: string;
}

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [tempoReal, setTempoReal] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<'monitor' | 'historico'>('monitor');
  const [logs, setLogs] = useState<LogEntrada[]>([]);
  const [filtro, setFiltro] = useState('TODOS');
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);
  const isProd = import.meta.env.PROD;

  const PROXIES = [
    (url: string) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  const enviarNotificacao = async (novaMensagem: string) => {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) return;
    try {
      const textoFinal = encodeURIComponent(`🚨 *Monitor*: ${novaMensagem}`);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${textoFinal}&apikey=${WHATSAPP_API_KEY}`;
      await fetch(url, { mode: 'no-cors' }); 
    } catch (e) { console.error('Erro WhatsApp'); }
  };

  const verificarPonte = async () => {
    const urlAlvo = `https://siga.apdl.pt/AberturaPonteMovel/?t=${Date.now()}`;
    
    if (!isProd) {
      try {
        const res = await fetch(`/api-apdl?t=${Date.now()}`);
        processarResposta(await res.text());
        return;
      } catch (e) { console.error("Erro local"); }
    }

    for (let i = 0; i < PROXIES.length; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(PROXIES[i](urlAlvo), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        let textoHTML = "";
        if (i === 1) {
          const json = await response.json();
          textoHTML = json.contents;
        } else {
          textoHTML = await response.text();
        }

        if (textoHTML && textoHTML.length > 100) {
          processarResposta(textoHTML);
          return;
        }
      } catch (e) { console.warn(`Proxy ${i + 1} falhou`); }
    }
  };

  const processarResposta = (html: string) => {
    const htmlNormalizado = html.toUpperCase();
    let novaCor = 'VERDE';
    let labelEstado = 'FECHADA';

    if (htmlNormalizado.includes('ABERTA') || htmlNormalizado.includes('MOVIMENTO') || 
        htmlNormalizado.includes('MANOBRA') || htmlNormalizado.includes('FECHADA AO') ||
        htmlNormalizado.includes('PROIBIDO')) {
      novaCor = 'VERMELHO';
      labelEstado = 'ABERTA';
    } 
    else if (htmlNormalizado.includes('PREPARA') || htmlNormalizado.includes('AGUARDA') || 
             htmlNormalizado.includes('AVISO')) {
      novaCor = 'AMARELO';
      labelEstado = 'PREPARAÇÃO';
    }

    // Registo de alteração de estado
    if (corRef.current !== 'OFF' && novaCor !== corRef.current) {
      const agora = new Date();
      const novoLog = {
        estado: labelEstado,
        data: agora.toLocaleDateString('pt-PT'),
        hora: agora.toLocaleTimeString('pt-PT')
      };
      setLogs(prev => [novoLog, ...prev]);
      enviarNotificacao(labelEstado === 'FECHADA' ? 'PONTE FECHADA - TRÂNSITO LIVRE' : `PONTE ${labelEstado}`);
    }

    setCor(novaCor);
    corRef.current = novaCor;
    inicializadoRef.current = true;
  };

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 15000); // Atualização rigorosa de 15 em 15 segundos
    return () => clearInterval(apiTimer);
  }, []);

  const downloadCSV = () => {
    const cabecalho = "Estado,Data,Hora\n";
    const linhas = logs.map(l => `${l.estado},${l.data},${l.hora}`).join("\n");
    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "historico_ponte.csv");
    link.click();
  };

  const logsFiltrados = filtro === 'TODOS' ? logs : logs.filter(l => l.estado === filtro);

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-950 font-sans text-center text-white overflow-x-hidden">
      
      {/* Navegação */}
      <nav className="flex gap-4 mt-8 mb-4">
        <button 
          onClick={() => setAbaAtiva('monitor')}
          className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'monitor' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}
        >
          Monitor
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')}
          className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${abaAtiva === 'historico' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500'}`}
        >
          Histórico ({logs.length})
        </button>
      </nav>

      {abaAtiva === 'monitor' ? (
        <div className="flex flex-col items-center justify-between flex-grow py-8 h-[80vh]">
          <h1 className="text-[5vh] font-black tracking-widest uppercase opacity-20 leading-none">
            Ponte Móvel
          </h1>
          
          <div className="h-[52vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5">
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_6vh_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_6vh_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_6vh_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'}`} />
          </div>

          <div className="flex flex-col items-center gap-2 mb-8">
            <span className="text-[4.5vh] font-mono font-light tracking-widest leading-none">
              {tempoReal.toLocaleTimeString('pt-PT')}
            </span>
            <span className="text-zinc-600 text-[1.2vh] uppercase font-bold tracking-[0.2em] opacity-80">
              {new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(tempoReal)}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-2xl px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <select 
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white text-xs p-2 rounded"
            >
              <option value="TODOS">Todos os Estados</option>
              <option value="ABERTA">Aberta</option>
              <option value="FECHADA">Fechada</option>
              <option value="PREPARAÇÃO">Preparação</option>
            </select>
            <button 
              onClick={downloadCSV}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-2 px-4 rounded uppercase"
            >
              Download CSV
            </button>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-800 text-zinc-400 uppercase font-bold">
                <tr>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {logsFiltrados.length > 0 ? logsFiltrados.map((log, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        log.estado === 'ABERTA' ? 'bg-red-900/40 text-red-400' :
                        log.estado === 'FECHADA' ? 'bg-emerald-900/40 text-emerald-400' :
                        'bg-yellow-900/40 text-yellow-400'
                      }`}>
                        {log.estado}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-400">{log.data}</td>
                    <td className="p-4 text-zinc-500 font-mono">{log.hora}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-zinc-600 uppercase tracking-widest">Sem registos</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}