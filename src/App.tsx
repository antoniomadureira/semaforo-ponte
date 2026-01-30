import { useState, useEffect, useRef } from 'react';

const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A ligar ao sistema...');
  const [tempoReal, setTempoReal] = useState(new Date());
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);

  // Função de notificação com correção de caracteres
  const enviarNotificacao = async (novaMensagem: string) => {
    try {
      // Corrigido: Texto com acentuação correta e codificação robusta
      const cabecalho = `🚨 *Monitor Ponte Móvel*:`;
      const corpo = `\n${novaMensagem}`;
      const textoFinal = encodeURIComponent(cabecalho + corpo);
      
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${textoFinal}&apikey=${WHATSAPP_API_KEY}`;
      
      await fetch(url, { mode: 'no-cors' }); 
      console.log('WhatsApp enviado com sucesso');
    } catch (e) {
      console.error('Erro ao enviar mensagem');
    }
  };

  const verificarPonte = async () => {
    try {
      const response = await fetch('/api-apdl?t=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error();
      
      const textoHTML = await response.text();
      const htmlNormalizado = textoHTML.toUpperCase();

      let novaCor = 'VERDE';
      let novaMensagem = 'PONTE FECHADA - TRÂNSITO LIVRE'; // Corrigido: TRÂNSITO

      if (
        htmlNormalizado.includes('ABERTA') || 
        htmlNormalizado.includes('MOVIMENTO') || 
        htmlNormalizado.includes('MANOBRA') || 
        htmlNormalizado.includes('FECHADA AO') ||
        htmlNormalizado.includes('PROIBIDO')
      ) {
        novaCor = 'VERMELHO';
        novaMensagem = 'PONTE ABERTA - TRÂNSITO PROIBIDO'; // Corrigido: TRÂNSITO
      } 
      else if (
        htmlNormalizado.includes('PREPARA') || 
        htmlNormalizado.includes('AGUARDA') || 
        htmlNormalizado.includes('AVISO')
      ) {
        novaCor = 'AMARELO';
        novaMensagem = 'PONTE EM PREPARAÇÃO - TRÂNSITO CONDICIONADO'; // Corrigido: TRÂNSITO
      }

      if (inicializadoRef.current && corRef.current !== 'OFF' && novaCor !== corRef.current) {
        enviarNotificacao(novaMensagem);
      }

      setCor(novaCor);
      setMensagem(novaMensagem);
      corRef.current = novaCor;
      inicializadoRef.current = true;

    } catch (error) {
      setMensagem('ERRO DE LIGAÇÃO');
      setCor('OFF');
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 5000);
    return () => clearInterval(apiTimer);
  }, []);

  const formatadorData = new Intl.DateTimeFormat('pt-PT', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  return (
    <div className="flex flex-col items-center justify-between h-[100svh] bg-slate-950 py-[5vh] font-sans px-4 text-center overflow-hidden">
      
      <div className="flex flex-col items-center gap-[1.5vh]">
        <h1 className="text-white text-[5vh] font-black tracking-widest uppercase opacity-20 leading-none">
          Ponte Móvel
        </h1>
        <div className="py-[0.8vh] px-[2vh] bg-zinc-900/50 rounded-full border border-zinc-800">
          <span className="text-zinc-400 text-[1.4vh] font-mono uppercase tracking-tighter">
            {mensagem}
          </span>
        </div>
      </div>
      
      <div className="h-[52vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5">
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${
          cor === 'VERMELHO' ? 'bg-red-600 shadow-[0_0_6vh_rgba(220,38,38,0.9)] scale-105' : 'bg-red-950/20'
        }`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${
          cor === 'AMARELO' ? 'bg-yellow-500 shadow-[0_0_6vh_rgba(234,179,8,0.9)] scale-105' : 'bg-yellow-950/20'
        }`} />
        <div className={`aspect-square w-full rounded-full transition-all duration-700 ${
          cor === 'VERDE' ? 'bg-emerald-500 shadow-[0_0_6vh_rgba(16,185,129,0.9)] scale-105' : 'bg-emerald-950/20'
        }`} />
      </div>

      <div className="flex flex-col items-center gap-[0.5vh] mb-[2vh]">
        <span className="text-white text-[4.5vh] font-mono font-light tracking-widest leading-none">
          {tempoReal.toLocaleTimeString('pt-PT')}
        </span>
        <span className="text-zinc-600 text-[1.2vh] uppercase font-bold tracking-[0.2em] opacity-80">
          {formatadorData.format(tempoReal)}
        </span>
      </div>

    </div>
  );
}