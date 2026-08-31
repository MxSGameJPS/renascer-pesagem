const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { ScaleService } = require("./services/scale-service.cjs");

let mainWindow = null;
const scaleService = new ScaleService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 660,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  scaleService.setDataListener((payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send("scale:data", payload);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function formatDiagnosticExport(payload = {}) {
  const samples = Array.isArray(payload.samples) ? payload.samples : [];
  const lines = [
    "RENASCER PESAGEM - CAPTURA SERIAL",
    `Gerado em: ${new Date().toISOString()}`,
    `Porta: ${payload.port || "não informada"}`,
    `Configuração: ${JSON.stringify(payload.settings || {})}`,
    `Blocos: ${samples.length}`,
    `Bytes: ${samples.reduce((sum, sample) => sum + Number(sample.byteLength || 0), 0)}`,
    "",
  ];

  for (const sample of samples) {
    const direction = sample.direction === "tx" ? "TX" : "RX";
    lines.push(`[${sample.receivedAt || "-"}] ${direction} ${sample.byteLength || 0} byte(s)`);
    lines.push(`TEXT: ${JSON.stringify(sample.rawText ?? "")}`);
    lines.push(`HEX : ${sample.rawHex || ""}`);
    lines.push("");
  }

  return lines.join("\n");
}

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle("scale:listPorts", () => scaleService.listPorts());
  ipcMain.handle("scale:status", () => scaleService.getStatus());
  ipcMain.handle("scale:connect", (_event, options) => scaleService.connect(options));
  ipcMain.handle("scale:disconnect", () => scaleService.disconnect());
  ipcMain.handle("scale:send", (_event, payload) => scaleService.send(payload));

  ipcMain.handle("diagnostics:export", async (_event, payload) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Exportar captura serial",
      defaultPath: `renascer-pesagem-${timestamp}.txt`,
      filters: [{ name: "Arquivo de texto", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) return { canceled: true };
    await fs.writeFile(result.filePath, formatDiagnosticExport(payload), "utf8");
    return { canceled: false, filePath: result.filePath };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", async () => {
  await scaleService.disconnect();
  if (process.platform !== "darwin") app.quit();
});
