require("dotenv").config();
const fs = require("fs");
const fetch = require("node-fetch");
const { execSync } = require("child_process");

const JSON_FILE = "historico_ponte.json";

// WhatsApp API
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE;
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

const URL_APDL = "https://siga.apdl.pt/AberturaPonteMovel/";

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

// Main monitoring function for GitHub Action
async function runMonitor() {
  let historico = readHistorico();
  let lastKnownState = historico.length > 0 ? historico[0].estado : "";

  const estadoAtual = await getBridgeStatus();

  if (estadoAtual && estadoAtual !== lastKnownState) {
    const agora = new Date();
    const newEntry = { estado: estadoAtual, timestamp: agora.toISOString() };
    historico.unshift(newEntry); // Add to the beginning for latest first
    writeHistorico(historico);

    console.log(
      `Estado mudou para ${estadoAtual}. Registo guardado no ficheiro JSON.`
    );

    // Commit and push the updated JSON file
    try {
      execSync("git config user.name 'github-actions[bot]'");
      execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");
      execSync(`git add ${JSON_FILE}`);
      execSync(`git commit -m "Atualizar histórico da ponte: ${estadoAtual}"`);
      execSync("git push");
      console.log("Ficheiro JSON atualizado e commitado no repositório.");
    } catch (error) {
      console.error("Erro ao commitar e fazer push do ficheiro JSON:", error);
    }

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

runMonitor();
