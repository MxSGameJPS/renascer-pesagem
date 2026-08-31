const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { ScaleService } = require("./services/scale-service.cjs");

let mainWindow = null;
const scaleService = new ScaleService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
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

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle("scale:listPorts", () => scaleService.listPorts());
  ipcMain.handle("scale:status", () => scaleService.getStatus());
  ipcMain.handle("scale:connect", (_event, options) => scaleService.connect(options));
  ipcMain.handle("scale:disconnect", () => scaleService.disconnect());
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
