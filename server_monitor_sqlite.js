require("dotenv").config();
const express = require("express");
const Database = require("better-sqlite3");
const fetch = require("node-fetch");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || "historico_ponte.db";

// Initialize SQLite database
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS historico_ponte (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    estado TEXT NOT NULL
  );
`);

// WhatsApp API
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

const URL_APDL = "https://siga.apdl.pt/AberturaPonteMovel/";

let lastKnownState = "";

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
    try {
      const stmt = db.prepare(
        "INSERT INTO historico_ponte (estado, timestamp) VALUES (?, ?)"
      );
      stmt.run(estadoAtual, agora.toISOString());
      console.log(
        `Estado mudou para ${estadoAtual}. Registo guardado no SQLite.`
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
    } catch (error) {
      console.error("Erro ao guardar no SQLite:", error);
    }
  }
}

// API endpoint to get historical data
app.get("/api/historico", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM historico_ponte ORDER BY timestamp DESC")
      .all();
    res.json(rows);
  } catch (error) {
    console.error("Erro ao obter histórico do SQLite:", error);
    res.status(500).json({ error: error.message });
  }
});

// Initial check and then set interval
(async () => {
  lastKnownState = await getBridgeStatus(); // Get initial state
  if (lastKnownState) {
    try {
      const stmt = db.prepare(
        "INSERT INTO historico_ponte (estado, timestamp) VALUES (?, ?)"
      );
      stmt.run(lastKnownState, new Date().toISOString());
      console.log("Estado inicial guardado no SQLite.");
    } catch (error) {
      console.error("Erro ao guardar estado inicial no SQLite:", error);
    }
  }
  setInterval(monitorBridge, 15000); // Monitor every 15 seconds
})();

app.listen(PORT, () => {
  console.log(`Servidor de monitorização SQLite a correr na porta ${PORT}`);
});
