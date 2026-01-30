import { useState, useEffect } from 'react';

export default function App() {
  const [cor, setCor] = useState('VERDE');
  const [mensagem, setMensagem] = useState('A ligar ao sistema...');
  const [tempoReal, setTempoReal] = useState(new Date());

  // 1. Lógica de consulta à APDL (a cada 5 segundos)
  const verificarPonte = async () => {
    try {
      const response = await fetch('/api-apdl');
      if (!response.ok) throw new Error();
      
      const textoHTML = await response.text();
      const htmlNormalizado = textoHTML.toUpperCase();

      if (htmlNormalizado.includes('ABERTA') || htmlNormalizado.includes('MOVIMENTO')) {
        setCor('VERMELHO');
        setMensagem('PONTE ABERTA - TRÂNSITO PROIBIDO');
      } else if (htmlNormalizado.includes('PREPARAÇÃO') || htmlNormalizado.includes('AGUARDA')) {
        setCor('AMARELO');
        setMensagem('PONTE EM PREPARAÇÃO - TRÂNSITO CONDICIONADO');
      } else {
        setCor('VERDE');
        setMensagem('PONTE FECHADA - TRÂNSITO LIVRE');
      }
    } catch (error) {
      console.error('Erro na atualização de dados');
    }
  };

  // 2. Efeito para o Relógio em Tempo Real (segundo a segundo)
  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Efeito para a Consulta da Ponte (a cada 5 segundos)
  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 5000);
    return () => clearInterval(apiTimer);
  }, []);

  // Formatação da data e hora em Português
  const formatadorData = new Intl.DateTimeFormat('pt-PT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-8 font-sans px-4 text-center">
      
      {/* Cabeçalho Minimalista */}
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-white text-4xl font-black tracking-widest uppercase opacity-20">
          Ponte Móvel
        </h1>
        <span className="py-1 px-4 bg-zinc-900/50 text-zinc-400 rounded-full text-[10px] font-mono border border-zinc-800 uppercase tracking-tighter">
          {mensagem}
        </span>
      </div>
      
      {/* Semáforo com Glow Intenso */}
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

      {/* Relógio e Data Atual (Por baixo do semáforo) */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-white text-2xl font-mono font-light tracking-widest">
          {tempoReal.toLocaleTimeString('pt-PT')}
        </span>
        <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em]">
          {formatadorData.format(tempoReal)}
        </span>
      </div>

    </div>
  );
}