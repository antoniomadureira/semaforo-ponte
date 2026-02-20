import { useState, useEffect, useRef } from 'react';

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A ligar ao sistema...');
  const [tempoReal, setTempoReal] = useState(new Date());
  const [historico, setHistorico] = useState<{data: string, estado: string}[]>([]);
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);

  const isProd = import.meta.env.PROD;
  const API_URL = isProd 
    ? 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/')
    : '/api-apdl';

  // URL do ficheiro de histórico no GitHub
  const HISTORICO_URL = `https://raw.githubusercontent.com/antoniomadureira/semaforo-ponte/main/historico_ponte.csv`;

  const carregarHistorico = async () => {
    try {
      const response = await fetch(`${HISTORICO_URL}?t=${Date.now()}`);
      if (!response.ok) return;
      const texto = await response.text();
      const linhas = texto.trim().split('\n').reverse().slice(0, 5); // Pega nas últimas 5 entradas
      const dadosFormatados = linhas.map(linha => {
        const [data, estado] = linha.split(',');
        return { data, estado };
      });
      setHistorico(dadosFormatados);
    } catch (e) {
      console.error("Erro ao carregar histórico");
    }
  };

  const enviarNotificacao = async (novaMensagem: string) => {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) return;
    try {
      const textoFinal = encodeURIComponent(`🚨 *Monitor*: ${novaMensagem}`);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${textoFinal}&apikey=${WHATSAPP_API_KEY}`;
      await fetch(url, { mode: 'no-cors' }); 
    } catch (e) { console.error('Erro WhatsApp'); }
  };

  const verificarPonte = async () => {
    try {
      const response = await fetch(`${API_URL}${API_URL.includes('?') ? '&' : '?'}t=${Date.now()}`, { 
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      });
      
      if (!response.ok) throw new Error();
      const textoHTML = await response.text();
      const htmlNormalizado = textoHTML.toUpperCase();

      let novaCor = 'VERDE';
      let novaMensagem = 'PONTE FECHADA - TRÂNSITO LIVRE';

      if (htmlNormalizado.includes('ABERTA') || htmlNormalizado.includes('MOVIMENTO') || 
          htmlNormalizado.includes('MANOBRA') || htmlNormalizado.includes('FECHADA AO') ||
          htmlNormalizado.includes('PROIBIDO')) {
        novaCor = 'VERMELHO';
        novaMensagem = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
      } 
      else if (htmlNormalizado.includes('PREPARA') || htmlNormalizado.includes('AGUARDA') || 
               htmlNormalizado.includes('AVISO')) {
        novaCor = 'AMARELO';
        novaMensagem = 'PONTE EM PREPARAÇÃO';
      }

      if (inicializadoRef.current && corRef.current !== 'OFF' && novaCor !== corRef.current) {
        enviarNotificacao(novaMensagem);
        carregarHistorico(); // Recarrega o histórico se houver mudança
      }

      setCor(novaCor);
      setMensagem(novaMensagem);
      corRef.current = novaCor;
      inicializadoRef.current = true;
    } catch (error) {
      if (!inicializadoRef.current) setMensagem('SISTEMA LENTO...');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    verificarPonte();
    carregarHistorico();
    const apiTimer = setInterval(verificarPonte, 15000);
    return () => { clearInterval(timer); clearInterval(apiTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center min-h-[100svh] bg-slate-950 py-10 font-sans px-4 text-center">
      
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-white text-4xl font-black tracking-widest uppercase opacity-20 mb-4">Ponte Móvel</h1>
        <div className="py-2 px-6 bg-zinc-900/50 rounded-full border border-zinc-800">
          <span className="text-zinc-400 text-sm font-mono uppercase">{mensagem}</span>
        </div>
      </div>
      
      {/* Semáforo */}
      <div className="h-[45vh] aspect-[1/2.4] bg-zinc-900 p-6 rounded-[50px] shadow-2xl border-4 border-zinc-800 flex flex-col justify-between mb-8">
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.8)]' : 'bg-red-950/20'}`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.8)]' : 'bg-yellow-950/20'}`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.8)]' : 'bg-emerald-950/20'}`} />
      </div>

      {/* Histórico Simples */}
      {historico.length > 0 && (
        <div className="w-full max-w-xs bg-zinc-900/30 rounded-2xl p-4 border border-zinc-800/50 mb-8">
          <h2 className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-3">Últimas Alterações</h2>
          <div className="flex flex-col gap-2">
            {historico.map((item, i) => (
              <div key={i} className="flex justify-between text-[11px] font-mono border-b border-zinc-800/30 pb-1">
                <span className="text-zinc-500">{item.data.split(',')[1]}</span>
                <span className={item.estado === 'ABERTA' ? 'text-red-500' : 'text-emerald-500'}>{item.estado}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Relógio */}
      <div className="mt-auto">
        <span className="text-white text-4xl font-mono font-light tracking-widest">{tempoReal.toLocaleTimeString('pt-PT')}</span>
      </div>
    </div>
  );
}
