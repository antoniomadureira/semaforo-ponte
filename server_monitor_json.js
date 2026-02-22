require("dotenv").config();
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const JSON_FILE = process.env.JSON_FILE || "historico_ponte.json";

// WhatsApp API
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

const URL_APDL = "https://siga.apdl.pt/AberturaPonteMovel/";

let lastKnownState = "";

// Function to read historical data from JSON file
function readHistorico() {
  if (fs.existsSync(JSON_FILE)) {
    const data = fs.readFileSync(JSON_FILE, "utf8");
    return JSON.parse(data);
  }
  return [];
}

// Function to write historical data to JSON file
function writeHistorico(historico) {
  fs.writeFileSync(JSON_FILE, JSON.stringify(historico, null, 2), "utf8");
}

// Function to fetch bridge status
async function getBridgeStatus() {
  try {
    const response = await fetch(URL_APDL);
    const textoHTML = (await response.text()).toUpperCase();

    let estado = "FECHADA";
    if (
      textoHTML.includes("ABERTA") ||
      textoHTML.includes("MOVIMENTO") ||
      textoHTML.includes("MANOBRA")
    ) {
      estado = "ABERTA";
    } else if (
      textoHTML.includes("PREPARA") ||
      textoHTML.includes("AGUARDA")
    ) {
      estado = "PREPARAÇÃO";
    }
    return estado;
  } catch (error) {
    console.error("Erro ao obter estado da ponte:", error);
    return null;
  }
}

// Function to send WhatsApp notification
async function enviarNotificacao(msg) {
  if (!WHATSAPP_PHONE || !WHATSAPP_API_KEY) {
    console.warn(
      "Variáveis de ambiente WHATSAPP_PHONE ou WHATSAPP_API_KEY não configuradas."
    );
    return;
  }
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(
      "🚨 " + msg
    )}&apikey=${WHATSAPP_API_KEY}`;
    await fetch(url);
    console.log("Notificação WhatsApp enviada.");
  } catch (e) {
    console.error("Erro ao enviar WhatsApp:", e);
  }
}

// Main monitoring function
async function monitorBridge() {
  const estadoAtual = await getBridgeStatus();
  if (estadoAtual && estadoAtual !== lastKnownState) {
    const agora = new Date();
    const historico = readHistorico();
    const newEntry = { estado: estadoAtual, timestamp: agora.toISOString() };
    historico.unshift(newEntry); // Add to the beginning for latest first
    writeHistorico(historico);

    console.log(
      `Estado mudou para ${estadoAtual}. Registo guardado no ficheiro JSON.`
    );
    lastKnownState = estadoAtual;
    let msgFull = "";
    if (estadoAtual === "ABERTA")
      msgFull = "PONTE ABERTA - TRÂNSITO PROIBIDO";
    else if (estadoAtual === "PREPARAÇÃO")
      msgFull = "PONTE EM PREPARAÇÃO";
    else msgFull = "PONTE FECHADA - TRÂNSITO LIVRE";

    await enviarNotificacao(
      `Ponte Móvel: O estado mudou para ${estadoAtual} às ${agora.toLocaleTimeString(
        "pt-PT"
      )}. ${msgFull}`
    );
  }
}

// API endpoint to get historical data
app.get("/api/historico", (req, res) => {
  try {
    const historico = readHistorico();
    res.json(historico);
  } catch (error) {
    console.error("Erro ao obter histórico do ficheiro JSON:", error);
    res.status(500).json({ error: error.message });
  }
});

// Initial check and then set interval
(async () => {
  lastKnownState = await getBridgeStatus(); // Get initial state
  if (lastKnownState) {
    const historico = readHistorico();
    const newEntry = { estado: lastKnownState, timestamp: new Date().toISOString() };
    historico.unshift(newEntry);
    writeHistorico(historico);
    console.log("Estado inicial guardado no ficheiro JSON.");
  }
  setInterval(monitorBridge, 15000); // Monitor every 15 seconds
})();

app.listen(PORT, () => {
  console.log(`Servidor de monitorização JSON a correr na porta ${PORT}`);
});
