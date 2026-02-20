import { useState, useEffect, useRef, useMemo } from 'react';

// Variáveis de ambiente para o WhatsApp (configuradas no GitHub Secrets)
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

  // ESTRATÉGIA DE REDE: Fallback entre proxies estáveis
  const tentarFetch = async (urlBase: string) => {
    const urlComTime = `${urlBase}?t=${Date.now()}`;
    const configs = [
      // 1. AllOrigins RAW (Costuma ser o mais resiliente)
      `https://api.allorigins.win/raw?url=${encodeURIComponent(urlComTime)}`,
      // 2. CORSProxy.io
      `https://corsproxy.io/?${encodeURIComponent(urlComTime)}`,
      // 3. CodeTabs (Sintaxe corrigida para evitar erro 400)
      `https://api.codetabs.com/v1/proxy?url=${encodeURIComponent(urlBase)}`
    ];

    for (const url of configs) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const html = await response.text();
          if (html && html.length > 500) return html;
        }
      } catch (e) { console.warn("A tentar próximo proxy..."); }
    }
    return null;
  };

  // PERSISTÊNCIA LOCAL: Carrega e guarda no browser (sem BD externa)
  useEffect(() => {
    const salvos = localStorage.getItem('historico_ponte_local');
    if (salvos) setLogs(JSON.parse(salvos));
  }, []);

  useEffect(() => {
    localStorage.setItem('historico_ponte_local', JSON.stringify(logs));
  }, [logs]);

  const enviarNotificacao = async (msg: string) => {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) return;
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent('🚨 ' + msg)}&apikey=${WHATSAPP_API_KEY}`;
      await fetch(url, { mode: 'no-cors' }); 
    } catch (e) { console.error('Erro WhatsApp'); }
  };

  const verificarPonte = async () => {
    const urlBase = 'https://siga.apdl.pt/AberturaPonteMovel/';
    let html = isProd ? await tentarFetch(urlBase) : "";

    // Simulação local para desenvolvimento
    if (!isProd) {
      try {
        const res = await fetch(`/api-apdl?t=${Date.now()}`);
        html = await res.text();
      } catch (e) { console.error("Erro local"); }
    }

    if (html) {
      const htmlNormalizado = html.toUpperCase();
      let novaCor = 'VERDE';
      let label = 'FECHADA';
      let msgFull = 'PONTE FECHADA - TRÂNSITO LIVRE';

      if (htmlNormalizado.includes('ABERTA') || htmlNormalizado.includes('MOVIMENTO') || 
          htmlNormalizado.includes('MANOBRA') || htmlNormalizado.includes('PROIBIDO')) {
        novaCor = 'VERMELHO'; label = 'ABERTA'; msgFull = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
      } else if (htmlNormalizado.includes('PREPARA') || htmlNormalizado.includes('AVISO')) {
        novaCor = 'AMARELO'; label = 'PREPARAÇÃO'; msgFull = 'PONTE EM PREPARAÇÃO';
      }

      if (corRef.current !== 'OFF' && novaCor !== corRef.current) {
        const agora = new Date();
        setLogs(prev => [{
          estado: label,
          data: agora.toLocaleDateString('pt-PT'),
          hora: agora.toLocaleTimeString('pt-PT'),
          timestamp: agora.getTime()
        }, ...prev]);
        enviarNotificacao(msgFull);
      }
      setCor(novaCor);
      setMensagem(msgFull);
      corRef.current = novaCor;
      inicializadoRef.current = true;
    }
  };

  // ESTATÍSTICAS: Tempo aberta hoje (Reset automático à meia-noite)
  const tempoAbertoHoje = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-PT');
    const logsHoje = [...logs].reverse().filter(l => l.data === hoje);
    let totalMs = 0;
    let inicioAbertura: number | null = null;

    logsHoje.forEach(log => {
      if (log.estado === 'ABERTA' && inicioAbertura === null) inicioAbertura = log.timestamp;
      else if (log.estado !== 'ABERTA' && inicioAbertura !== null) {
        totalMs += log.timestamp - inicioAbertura;
        inicioAbertura = null;
      }
    });
    if (inicioAbertura !== null && cor === 'VERMELHO') totalMs += Date.now() - inicioAbertura;

    const segs = Math.floor(totalMs / 1000);
    const h = Math.floor(segs / 3600).toString().padStart(2, '0');
    const m = Math.floor((segs % 3600) / 60).toString().padStart(2, '0');
    const s = (segs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }, [logs, cor, tempoReal.getSeconds()]);

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 15000);
    return () => clearInterval(apiTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-[100svh] bg-slate-950 font-sans text-center text-white overflow-hidden py-[4vh] relative">
      
      {/* HEADER: Título e Ícone Substituto */}
      <div className="flex flex-col items-center gap-[1.5vh] z-10">
        <div className="flex items-center gap-3">
          {/* Ícone de Ponte (SVG Customizado) em vez do Vercel */}
          <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 21h18M3 7l9-4 9 4M5 21V7m14 14V7m-7 14V11" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-white text-[4vh] font-black tracking-widest uppercase opacity-20 leading-none">Ponte Móvel</h1>
        </div>
        <div className="py-[0.8vh] px-[2vh] bg-zinc-900/50 rounded-full border border-zinc-800 min-w-[240px]">
          <span className="text-white text-[1.3vh] font-mono uppercase tracking-tighter">
            {cor === 'OFF' ? 'A ATUALIZAR...' : mensagem}
          </span>
        </div>
      </div>

      {abaAtiva === 'monitor' ? (
        <div className="flex flex-col items-center justify-center flex-grow mb-20">
          <div className="h-[46vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5 relative">
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_6vh_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_6vh_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'}`} />
            <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_6vh_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'}`} />
          </div>
          <div className="mt-8 flex flex-col gap-1">
            <span className="text-[4vh] font-mono font-light tracking-widest leading-none">{tempoReal.toLocaleTimeString('pt-PT')}</span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md px-4 flex-grow overflow-y-auto mb-28 mt-4 scrollbar-hide">
          <div className="bg-zinc-900/80 p-3 rounded-lg border border-zinc-800 flex justify-between items-center mb-4">
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest">Tempo Aberta Hoje:</span>
            <span className="text-red-500 font-mono font-bold text-sm">{tempoAbertoHoje}</span>
          </div>
          <div className="flex justify-between mb-4 gap-2">
            <select onChange={(e) => setFiltro(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-[9px] p-2 rounded uppercase text-zinc-400 flex-grow outline-none">
              <option value="TODOS">Todos os Registos</option>
              <option value="ABERTA">Abertas</option>
              <option value="FECHADA">Fechadas</option>
            </select>
            <button onClick={() => {
              const csv = "Estado,Data,Hora\n" + logs.map(l => `${l.estado},${l.data},${l.hora}`).join("\n");
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'historico_ponte.csv'; a.click();
            }} className="bg-emerald-600/20 text-emerald-400 border border-emerald-900/50 text-[9px] font-bold px-4 rounded uppercase">CSV</button>
          </div>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-[11px]">
              <tbody className="divide-y divide-zinc-800/50">
                {(filtro === 'TODOS' ? logs : logs.filter(l => l.estado === filtro)).map((log, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
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

      {/* NAVEGAÇÃO INFERIOR */}
      <nav className="flex gap-2 absolute bottom-6 z-20 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-full border border-white/5 shadow-2xl">
        <button onClick={() => setAbaAtiva('monitor')} className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase transition-all ${abaAtiva === 'monitor' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>Monitor</button>
        <button onClick={() => setAbaAtiva('historico')} className={`px-6 py-2 rounded-full text-[9px] font-bold uppercase transition-all ${abaAtiva === 'historico' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>Histórico</button>
      </nav>

    </div>
  );
}