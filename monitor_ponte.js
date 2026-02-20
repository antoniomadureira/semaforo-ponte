// monitor_ponte.js
const PHONE = process.env.VITE_WHATSAPP_PHONE;
const KEY = process.env.VITE_WHATSAPP_API_KEY;
const URL_APDL = 'https://siga.apdl.pt/AberturaPonteMovel/';

async function verificar() {
  if (!PHONE || !KEY) {
    console.error("Erro: Variáveis de ambiente VITE_WHATSAPP_PHONE ou VITE_WHATSAPP_API_KEY não configuradas.");
    return;
  }

  try {
    const response = await fetch(URL_APDL);
    const textoHTML = (await response.text()).toUpperCase();

    // Lógica de deteção (igual à do seu App.tsx)
    const ponteAberta = textoHTML.includes('ABERTA') || 
                        textoHTML.includes('MOVIMENTO') || 
                        textoHTML.includes('MANOBRA');

    if (ponteAberta) {
      console.log("Ponte aberta detetada! A enviar notificação...");
      const msg = encodeURIComponent("🚨 *Aviso Automático*: A Ponte Móvel de Leça está ABERTA ou em movimento.");
      const urlWa = `https://api.callmebot.com/whatsapp.php?phone=${PHONE}&text=${msg}&apikey=${KEY}`;
      
      await fetch(urlWa);
    } else {
      console.log("Ponte fechada. Sem necessidade de aviso.");
    }
  } catch (error) {
    console.error("Erro ao consultar a APDL:", error);
  }
}

verificar();
