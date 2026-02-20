import { useState, useEffect, useRef, useMemo } from 'react';

// Variáveis de ambiente configuradas no GitHub Secrets
const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

interface LogEntrada {
  estado: string;
  data: string;
  hora: string;
  timestamp: number;
}

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A ATUALIZAR...');
  const [tempoReal, setTempoReal] = useState(new Date());
  const [abaAtiva, setAbaAtiva] = useState<'monitor' | 'historico'>('monitor');
  const [logs, setLogs] = useState<LogEntrada[]>([]);
  const [filtro, setFiltro] = useState('TODOS');
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);
  const isProd = import.meta.env.PROD;

  // Lista de Proxies otimizada para evitar erros 400/CORS
  const PROXIES = [
    (url: string) => `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];

  // Carregar histórico do localStorage ao iniciar
  useEffect(() => {
    const salvos = localStorage.getItem('historico_ponte');
    if (salvos) setLogs(JSON.parse(salvos));
  }, []);

  // Guardar histórico sempre que houver alteração
  useEffect(() => {
    localStorage.setItem('historico_ponte', JSON.stringify(logs));
  }, [logs]);

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
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(PROXIES[i](urlAlvo), { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        let textoHTML = "";
        if (i === 1) { // AllOrigins via /get retorna JSON
          const json = await response.json();
          textoHTML = json.contents;
        } else {
          textoHTML = await response.text();
        }

        if (textoHTML && textoHTML.length > 100) {
          processarResposta(textoHTML);
          return;
        }
      } catch (e) { /* Falha silenciosa para o próximo proxy */ }
    }
  };

  const processarResposta = (html: string) => {
    const htmlNormalizado = html.toUpperCase();
    let novaCor = 'VERDE';
    let labelEstado = 'FECHADA';
    let msgCompleta = 'PONTE FECHADA - TRÂNSITO LIVRE';

    if (htmlNormalizado.includes('ABERTA') || htmlNormalizado.includes('MOVIMENTO') || 
        htmlNormalizado.includes('MANOBRA') || htmlNormalizado.includes('FECHADA AO') ||
        htmlNormalizado.includes('PROIBIDO')) {
      novaCor = 'VERMELHO';
      labelEstado = 'ABERTA';
      msgCompleta = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
    } 
    else if (htmlNormalizado.includes('PREPARA') || htmlNormalizado.includes('AGUARDA') || 
             htmlNormalizado.includes('AVISO')) {
      novaCor = 'AMARELO';
      labelEstado = 'PREPARAÇÃO';
      msgCompleta = 'PONTE EM PREPARAÇÃO';
    }

    if (corRef.current !== 'OFF' && novaCor !== corRef.current) {
      const agora = new Date();
      setLogs(prev => [{
        estado: labelEstado,
        data: agora.toLocaleDateString('pt-PT'),
        hora: agora.toLocaleTimeString('pt-PT'),
        timestamp: agora.getTime()
      }, ...prev]);
      enviarNotificacao(msgCompleta);
    }

    setCor(novaCor);
    setMensagem(msgCompleta);
    corRef.current = novaCor;
    inicializadoRef.current = true;
  };

  // Cálculo de estatísticas (Tempo Aberta Hoje)
  const tempoAbertoHoje = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-PT');
    const logsHoje = [...logs].reverse().filter(l => l.data === hoje);
    let totalMs = 0;
    let inicioAbertura: number | null = null;

    logsHoje.forEach(log => {
      if (log.estado === 'ABERTA' && inicioAbertura === null) {
        inicioAbertura = log.timestamp;
      } else if (log.estado !== 'ABERTA' && inicioAbertura !== null) {
        totalMs += log.timestamp - inicioAbertura;
        inicioAbertura = null;
      }
    });

    if (inicioAbertura !== null && cor === 'VERMELHO') {
      totalMs += Date.now() - inicioAbertura;
    }

    const segs = Math.floor(totalMs / 1000);
    const h = Math.floor(segs / 3600);
    const m = Math.floor((segs % 3600) / 60);
    return `${h}h ${m}m`;
  }, [logs, cor]);

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 15000); // 15s conforme solicitado
    return () => clearInterval(apiTimer);
  }, []);

  const downloadCSV = () => {
    const csv = "Estado,Data,Hora\n" + logs.map(l => `${l.estado},${l.data},${l.hora}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'historico_ponte.csv'; a.click();
  };

  return (
    <div className="flex flex-col items-center justify-between h-[100svh] bg-slate-950 font-sans text-center text-white overflow-hidden py-[4vh] relative">
      
      {/* Mensagem de Estado Uniformizada */}
      <div className="flex flex-col items-center gap-[1.5vh] z-10">
        <h1 className="text-white text-[5vh] font-black tracking-widest uppercase opacity-20 leading-none">Ponte Móvel</h1>
        <div className="py-[0.8vh] px-[2vh] bg-zinc-900/50 rounded-full border border-zinc-800 min-w-[220px]">
          <span className="text-white text-[1.3vh] font-mono uppercase tracking-tighter">
            {cor === 'OFF' ? 'A ATUALIZAR...' : mensagem}
          </span>
        </div>
      </div>

      {abaAtiva === 'monitor' ? (
        <div className="flex flex-col items-center justify-center flex-grow mb-16">
          <div className="h-[48vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5 relative">
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_6vh_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_6vh_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_6vh_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'}`} />
          </div>
          <div className="mt-8">
            <span className="text-[4vh] font-mono font-light tracking-widest">{tempoReal.toLocaleTimeString('pt-PT')}</span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md px-4 flex-grow overflow-y-auto mb-24 mt-4 scrollbar-hide">
          <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex justify-between items-center mb-4">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Aberta Hoje:</span>
            <span className="text-red-500 font-mono font-bold">{tempoAbertoHoje}</span>
          </div>
          <div className="flex justify-between mb-4">
            <select onChange={(e) => setFiltro(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-[9px] p-2 rounded uppercase text-zinc-400">
              <option value="TODOS">Todos</option>
              <option value="ABERTA">Aberta</option>
              <option value="FECHADA">Fechada</option>
            </select>
            <button onClick={downloadCSV} className="bg-emerald-600/20 text-emerald-400 border border-emerald-900/50 text-[9px] font-bold px-3 rounded">CSV</button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <tbody className="divide-y divide-zinc-800/50">
                {(filtro === 'TODOS' ? logs : logs.filter(l => l.estado === filtro)).map((log, i) => (
                  <tr key={i} className="hover:bg-white/5">
                    <td className={`p-3 font-bold ${log.estado === 'ABERTA' ? 'text-red-500' : 'text-emerald-500'}`}>{log.estado}</td>
                    <td className="p-3 text-zinc-500">{log.data}</td>
                    <td className="p-3 text-zinc-600 font-mono">{log.hora}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navegação Inferior (Botões Pequenos e Fixos) */}
      <nav className="flex gap-2 absolute bottom-8 z-20">
        <button onClick={() => setAbaAtiva('monitor')} className={`px-5 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all ${abaAtiva === 'monitor' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>Monitor</button>
        <button onClick={() => setAbaAtiva('historico')} className={`px-5 py-1.5 rounded-full text-[9px] font-bold uppercase transition-all ${abaAtiva === 'historico' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>Histórico</button>
      </nav>

    </div>
  );
}