require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// WhatsApp API
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

const URL_APDL = 'https://siga.apdl.pt/AberturaPonteMovel/';

let lastKnownState = '';

// Function to fetch bridge status
async function getBridgeStatus() {
  try {
    const response = await fetch(URL_APDL);
    const textoHTML = (await response.text()).toUpperCase();

    let estado = 'FECHADA';
    if (textoHTML.includes('ABERTA') || textoHTML.includes('MOVIMENTO') || textoHTML.includes('MANOBRA')) {
      estado = 'ABERTA';
    } else if (textoHTML.includes('PREPARA') || textoHTML.includes('AGUARDA')) {
      estado = 'PREPARAÇÃO';
    }
    return estado;
  } catch (error) {
    console.error('Erro ao obter estado da ponte:', error);
    return null;
  }
}

// Function to send WhatsApp notification
async function enviarNotificacao(msg) {
  if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
    console.warn('Variáveis de ambiente WHATSAPP_PHONE ou WHATSAPP_API_KEY não configuradas.');
    return;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent('🚨 ' + msg)}&apikey=${WHATSAPP_API_KEY}`;
    await fetch(url);
    console.log('Notificação WhatsApp enviada.');
  } catch (e) {
    console.error('Erro ao enviar WhatsApp:', e);
  }
}

// Main monitoring function
async function monitorBridge() {
  const estadoAtual = await getBridgeStatus();
  if (estadoAtual && estadoAtual !== lastKnownState) {
    const agora = new Date();
    const { data, error } = await supabase
      .from('historico_ponte')
      .insert([{ estado: estadoAtual, timestamp: agora.toISOString() }]);

    if (error) {
      console.error('Erro ao guardar no Supabase:', error);
    } else {
      console.log(`Estado mudou para ${estadoAtual}. Registo guardado no Supabase.`);
      lastKnownState = estadoAtual;
      let msgFull = '';
      if (estadoAtual === 'ABERTA') msgFull = 'PONTE ABERTA - TRÂNSITO PROIBIDO';
      else if (estadoAtual === 'PREPARAÇÃO') msgFull = 'PONTE EM PREPARAÇÃO';
      else msgFull = 'PONTE FECHADA - TRÂNSITO LIVRE';

      await enviarNotificacao(`Ponte Móvel: O estado mudou para ${estadoAtual} às ${agora.toLocaleTimeString('pt-PT')}. ${msgFull}`);
    }
  }
}

// API endpoint to get historical data
app.get('/api/historico', async (req, res) => {
  const { data, error } = await supabase
    .from('historico_ponte')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Erro ao obter histórico do Supabase:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Initial check and then set interval
(async () => {
  lastKnownState = await getBridgeStatus(); // Get initial state
  if (lastKnownState) {
    const { data, error } = await supabase
      .from('historico_ponte')
      .insert([{ estado: lastKnownState, timestamp: new Date().toISOString() }]);
    if (error) console.error('Erro ao guardar estado inicial no Supabase:', error);
    else console.log('Estado inicial guardado no Supabase.');
  }
  setInterval(monitorBridge, 15000); // Monitor every 15 seconds
})();

app.listen(PORT, () => {
  console.log(`Servidor de monitorização a correr na porta ${PORT}`);
});
