import { useState, useEffect, useRef } from 'react';

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A LIGAR AO SISTEMA...');
  const [tempoReal, setTempoReal] = useState(new Date());
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);

  // Lógica de Proxy para funcionar no GitHub Pages
  const isProd = import.meta.env.PROD;
  const API_URL = isProd 
    ? 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/')
    : '/api-apdl';

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
        cache: 'no-store'
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
      }

      setCor(novaCor);
      setMensagem(novaMensagem);
      corRef.current = novaCor;
      inicializadoRef.current = true;
    } catch (error) {
      // Mantém a última mensagem em vez de "Sistema Lento"
      if (!inicializadoRef.current) setMensagem('A TENTAR LIGAÇÃO...');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 10000); // 10 segundos para equilíbrio
    return () => { clearInterval(timer); clearInterval(apiTimer); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-10 font-sans p-6">
      
      {/* Cabeçalho Original */}
      <div className="text-center">
        <h1 className="text-white text-3xl font-black tracking-widest uppercase opacity-40 mb-4">
          Ponte Móvel
        </h1>
        <div className="py-2 px-6 bg-zinc-900/50 rounded-full border border-zinc-800 inline-block">
          <span className="text-zinc-400 text-xs font-mono uppercase tracking-widest">
            {mensagem}
          </span>
        </div>
      </div>
      
      {/* Semáforo Grande e Original */}
      <div className="w-32 bg-zinc-900 p-8 rounded-[50px] shadow-2xl border-4 border-zinc-800 flex flex-col gap-8 ring-1 ring-white/5">
        <div className={`w-16 h-16 rounded-full transition-all duration-700 ${
          cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_60px_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'
        }`} />
        <div className={`w-16 h-16 rounded-full transition-all duration-700 ${
          cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'
        }`} />
        <div className={`w-16 h-16 rounded-full transition-all duration-700 ${
          cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_60px_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'
        }`} />
      </div>

      {/* Relógio em baixo */}
      <div className="text-center">
        <span className="text-white text-3xl font-mono font-light tracking-[0.2em]">
          {tempoReal.toLocaleTimeString('pt-PT')}
        </span>
      </div>

    </div>
  );
}
