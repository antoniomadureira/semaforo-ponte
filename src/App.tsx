import { useState, useEffect, useRef } from 'react';

// Variáveis de ambiente configuradas no GitHub Secrets e no ficheiro .env
const WHATSAPP_PHONE = import.meta.env.VITE_WHATSAPP_PHONE;
const WHATSAPP_API_KEY = import.meta.env.VITE_WHATSAPP_API_KEY;

/**
 * App: Monitor de Semáforo da Ponte Móvel
 * Configurado para detetar automaticamente o ambiente (Local vs Produção)
 * Resolve erros de CORS via AllOrigins JSON Wrapper.
 */
export default function App() {
  const [cor, setCor] = useState('OFF');
  const [mensagem, setMensagem] = useState('A INICIAR SISTEMA...');
  const [tempoReal, setTempoReal] = useState(new Date());
  const [carregandoInicial, setCarregandoInicial] = useState(true);
  
  const corRef = useRef('OFF');
  const inicializadoRef = useRef(false);
  const isProd = import.meta.env.PROD;

  // Lógica de URL: AllOrigins /get é mais estável para evitar bloqueios de CORS (null)
  const API_URL = isProd 
    ? 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://siga.apdl.pt/AberturaPonteMovel/')
    : '/api-apdl';

  // Função de notificação via WhatsApp (CallMeBot)
  const enviarNotificacao = async (novaMensagem: string) => {
    if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) return;
    try {
      const textoFinal = encodeURIComponent(`🚨 *Monitor Ponte Móvel*: ${novaMensagem}`);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${textoFinal}&apikey=${WHATSAPP_API_KEY}`;
      
      // Modo no-cors para evitar que falhas no WhatsApp bloqueiem o semáforo
      await fetch(url, { mode: 'no-cors' }); 
      console.log('Notificação enviada.');
    } catch (e) {
      console.error('Erro ao enviar mensagem para o WhatsApp');
    }
  };

  const verificarPonte = async () => {
    try {
      if (!inicializadoRef.current) setMensagem('A CONSULTAR APDL...');
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 20000); // 20s de paciência para o proxy

      // Em produção, o AllOrigins devolve um JSON. Em local, o proxy do Vite devolve texto.
      const response = await fetch(`${API_URL}${isProd ? '' : '?t=' + Date.now()}`, { 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(id);

      if (!response.ok) throw new Error('Falha na resposta da rede');
      
      let textoHTML = "";
      if (isProd) {
        const json = await response.json();
        textoHTML = json.contents; // O conteúdo real do site da APDL está aqui
      } else {
        textoHTML = await response.text();
      }

      if (!textoHTML) throw new Error('Conteúdo vazio');
      
      const htmlNormalizado = textoHTML.toUpperCase();

      let novaCor = 'VERDE';
      let novaMensagem = 'PONTE FECHADA - TRÂNSITO LIVRE';

      // Lógica de deteção baseada nas palavras-chave oficiais da APDL
      if (
        htmlNormalizado.includes('ABERTA') || 
        htmlNormalizado.includes('MOVIMENTO') || 
        htmlNormalizado.includes('MANOBRA') || 
        htmlNormalizado.includes('FECHADA AO') ||
        htmlNormalizado.includes('PROIBIDO')
      ) {
        novaCor = 'VERMELHO';
        novaMensagem = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
      } 
      else if (
        htmlNormalizado.includes('PREPARA') || 
        htmlNormalizado.includes('AGUARDA') || 
        htmlNormalizado.includes('AVISO')
      ) {
        novaCor = 'AMARELO';
        novaMensagem = 'PONTE EM PREPARAÇÃO';
      }

      // Só envia notificação se a cor mudar e não for o primeiro carregamento
      if (inicializadoRef.current && corRef.current !== 'OFF' && novaCor !== corRef.current) {
        enviarNotificacao(novaMensagem);
      }

      setCor(novaCor);
      setMensagem(novaMensagem);
      corRef.current = novaCor;
      inicializadoRef.current = true;
      setCarregandoInicial(false);

    } catch (error) {
      // Se falhar na primeira carga, mostra erro. Se já estava a funcionar, mantém a cor anterior.
      if (!inicializadoRef.current) {
        setMensagem('REDE LENTA - A TENTAR NOVAMENTE...');
        setCor('OFF');
      }
      console.error("Erro de sincronização com a ponte.");
    }
  };

  // Timer do relógio digital
  useEffect(() => {
    const timer = setInterval(() => setTempoReal(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Timer de consulta da API (20 segundos para evitar bloqueios de IP)
  useEffect(() => {
    verificarPonte();
    const apiTimer = setInterval(verificarPonte, 20000);
    return () => clearInterval(apiTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-between h-[100svh] bg-slate-950 py-[5vh] font-sans px-4 text-center overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex flex-col items-center gap-[1.5vh]">
        <h1 className="text-white text-[5vh] font-black tracking-widest uppercase opacity-20 leading-none">
          Ponte Móvel
        </h1>
        <div className="py-[0.8vh] px-[2vh] bg-zinc-900/50 rounded-full border border-zinc-800">
          <span className={`text-[1.4vh] font-mono uppercase tracking-tighter ${cor === 'OFF' ? 'text-orange-400' : 'text-zinc-400'}`}>
            {mensagem}
          </span>
        </div>
      </div>
      
      {/* Estrutura do Semáforo */}
      <div className="h-[52vh] aspect-[1/2.4] bg-zinc-900 p-[3vh] rounded-[8vh] shadow-2xl border-[0.6vh] border-zinc-800 flex flex-col justify-between ring-1 ring-white/5 relative">
        
        {/* Spinner de carregamento */}
        {carregandoInicial && (
           <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-[8vh] z-10">
              <div className="w-8 h-8 border-4 border-zinc-700 border-t-white rounded-full animate-spin"></div>
           </div>
        )}

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

      {/* Relógio e Data */}
      <div className="flex flex-col items-center gap-[0.5vh] mb-[2vh]">
        <span className="text-white text-[4.5vh] font-mono font-light tracking-widest leading-none">
          {tempoReal.toLocaleTimeString('pt-PT')}
        </span>
        <span className="text-zinc-600 text-[1.2vh] uppercase font-bold tracking-[0.2em] opacity-80">
          {new Intl.DateTimeFormat('pt-PT', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          }).format(tempoReal)}
        </span>
      </div>

    </div>
  );
}