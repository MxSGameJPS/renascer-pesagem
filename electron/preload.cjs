const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("renascer", {
  app: {
    info: () => ipcRenderer.invoke("app:info"),
  },
  scale: {
    listPorts: () => ipcRenderer.invoke("scale:listPorts"),
    status: () => ipcRenderer.invoke("scale:status"),
    connect: (options) => ipcRenderer.invoke("scale:connect", options),
    disconnect: () => ipcRenderer.invoke("scale:disconnect"),
    send: (payload) => ipcRenderer.invoke("scale:send", payload),
    onData: (callback) => {
      const handler = (_event, payload) => callback(payload);
      ipcRenderer.on("scale:data", handler);
      return () => ipcRenderer.removeListener("scale:data", handler);
    },
  },
  diagnostics: {
    exportCapture: (payload) => ipcRenderer.invoke("diagnostics:export", payload),
  },
});
