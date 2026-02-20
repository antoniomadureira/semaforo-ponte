import { useState, useEffect, useRef } from 'react';

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A LIGAR AO SISTEMA...');
  const [tempoReal, setTempoReal] = useState(new Date());
  const [historico, setHistorico] = useState<{data: string, estado: string}[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);

  const isProd = import.meta.env.PROD;
  // Proxy corsproxy.io para evitar o erro "Sistema Lento" em redes móveis
  const API_URL = isProd 
    ? 'https://corsproxy.io/?' + encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/')
    : '/api-apdl';

  const HISTORICO_URL = `https://raw.githubusercontent.com/antoniomadureira/semaforo-ponte/main/historico_ponte.csv`;

  const carregarHistorico = async () => {
    try {
      const response = await fetch(`${HISTORICO_URL}?t=${Date.now()}`);
      if (!response.ok) return;
      const texto = await response.text();
      const linhas = texto.trim().split('\n').reverse().slice(0, 10);
      setHistorico(linhas.map(l => ({ data: l.split(',')[0], estado: l.split(',')[1] })));
    } catch (e) { console.error("Erro ao carregar histórico"); }
  };

  const enviarNotificacao = async (novaMensagem: string) => {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) return;
    try {
      const textoFinal = encodeURIComponent(`🚨 *Monitor Ponte Móvel*: \n${novaMensagem}`);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${textoFinal}&apikey=${WHATSAPP_API_KEY}`;
      await fetch(url, { mode: 'no-cors' }); 
    } catch (e) { console.error('Erro WhatsApp'); }
  };

  const verificarPonte = async () => {
    try {
      const response = await fetch(`${API_URL}${isProd ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const textoHTML = await response.text();
      const html = textoHTML.toUpperCase();

      let novaCor = 'VERDE', novaMsg = 'PONTE FECHADA - TRÂNSITO LIVRE';
      if (html.includes('ABERTA') || html.includes('MOVIMENTO') || html.includes('MANOBRA')) {
        novaCor = 'VERMELHO'; novaMsg = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
      } else if (html.includes('PREPARA') || html.includes('AGUARDA')) {
        novaCor = 'AMARELO'; novaMsg = 'PONTE EM PREPARAÇÃO';
      }

      if (inicializadoRef.current && corRef.current !== 'OFF' && novaCor !== corRef.current) {
        enviarNotificacao(novaMsg);
        carregarHistorico();
      }

      setCor(novaCor); setMensagem(novaMsg);
      corRef.current = novaCor; inicializadoRef.current = true;
    } catch (e) { if (!inicializadoRef.current) setMensagem('A TENTAR LIGAÇÃO...'); }
  };

  useEffect(() => {
    const t = setInterval(() => setTempoReal(new Date()), 1000);
    verificarPonte(); carregarHistorico();
    const a = setInterval(verificarPonte, 15000);
    return () => { clearInterval(t); clearInterval(a); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-[100svh] bg-slate-950 py-[5vh] font-sans px-4 text-center overflow-hidden relative">
      
      {/* Botão do Histórico (Relógio no canto superior direito) */}
      <button 
        onClick={() => { carregarHistorico(); setMostrarModal(true); }}
        className="absolute top-4 right-4 p-3 bg-zinc-900/50 rounded-full border border-zinc-800 text-zinc-500 hover:text-white z-50 active:scale-95 transition-transform"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </button>

      {/* Janela Modal do Histórico (Abre por cima de tudo) */}
      {mostrarModal && (
        <div className="absolute inset-0 z-[100] bg-slate-950/95 flex items-center justify-center p-6">
          <div className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
            <h2 className="text-white text-lg font-bold mb-4 uppercase opacity-50 tracking-widest">Histórico</h2>
            <div className="flex flex-col gap-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
              {historico.length > 0 ? historico.map((item, i) => (
                <div key={i} className="flex justify-between text-[10px] font-mono border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500">{item.data}</span>
                  <span className={item.estado === 'ABERTA' ? 'text-red-500' : 'text-emerald-500'}>{item.estado}</span>
                </div>
              )) : <span className="text-zinc-600 text-[10px]">A carregar registos...</span>}
            </div>
            <button onClick={() => setMostrarModal(false)} className="w-full py-3 bg-white/10 text-white rounded-xl font-bold uppercase text-xs tracking-widest">Fechar</button>
          </div>
        </div>
      )}

      {/* Layout Original Grande */}
      <div className="flex flex-col items-center gap-[1.5vh]">
        <h1 className="text-white text-[5vh] font-black tracking-widest uppercase opacity-20 leading-none">Ponte Móvel</h1>
        <div className="py-[0.8vh] px-[2vh] bg-zinc-900/50 rounded-full border border-zinc-800">
          <span className="text-zinc-400 text-[1.4vh] font-mono uppercase tracking-tighter">{mensagem}</span>
        </div>
      </div>
      
      <div className="h-[52vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5">
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_6vh_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'}`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_6vh_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'}`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_6vh_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'}`} />
      </div>

      <div className="mb-[2vh]">
        <span className="text-white text-[4.5vh] font-mono font-light tracking-widest leading-none">
          {tempoReal.toLocaleTimeString('pt-PT')}
        </span>
      </div>
    </div>
  );
}
