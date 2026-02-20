const fs = require('fs');
const PHONE = process.env.VITE_WHATSAPP_PHONE;
const KEY = process.env.VITE_WHATSAPP_API_KEY;
const URL_APDL = 'https://siga.apdl.pt/AberturaPonteMovel/';
const LOG_FILE = 'historico_ponte.csv';

async function verificar() {
  try {
    const response = await fetch(URL_APDL);
    const textoHTML = (await response.text()).toUpperCase();
    const agora = new Date().toLocaleString('pt-PT');

    let estado = 'FECHADA';
    if (textoHTML.includes('ABERTA') || textoHTML.includes('MOVIMENTO') || textoHTML.includes('MANOBRA')) {
      estado = 'ABERTA';
    } else if (textoHTML.includes('PREPARA') || textoHTML.includes('AGUARDA')) {
      estado = 'PREPARAÇÃO';
    }

    // 1. Ler o último estado registado para evitar notificações repetidas
    let ultimoEstado = '';
    if (fs.existsSync(LOG_FILE)) {
      const linhas = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
      ultimoEstado = linhas[linhas.length - 1].split(',')[1];
    }

    // 2. Se o estado mudou, regista na "tabela" e envia WhatsApp
    if (estado !== ultimoEstado) {
      const novaLinha = `${agora},${estado}\n`;
      fs.appendFileSync(LOG_FILE, novaLinha);
      console.log(`Estado mudou para ${estado}. Registo guardado.`);

      if (estado === 'ABERTA' || estado === 'PREPARAÇÃO') {
        const msg = encodeURIComponent(`🚨 *Ponte Móvel*: O estado mudou para ${estado} às ${agora}.`);
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=${PHONE}&text=${msg}&apikey=${KEY}`);
      }
    }
  } catch (error) {
    console.error("Erro na monitorização:", error);
  }
}

verificar();
