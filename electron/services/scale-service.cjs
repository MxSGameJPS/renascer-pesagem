const { SerialPort } = require("serialport");

const DEFAULT_BAUD_RATE = 9600;

class ScaleService {
  constructor() {
    this.port = null;
    this.dataListener = null;
    this.lastError = null;
  }

  setDataListener(listener) {
    this.dataListener = typeof listener === "function" ? listener : null;
  }

  async listPorts() {
    const ports = await SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer ?? null,
      serialNumber: port.serialNumber ?? null,
      vendorId: port.vendorId ?? null,
      productId: port.productId ?? null,
    }));
  }

  getStatus() {
    return {
      connected: Boolean(this.port?.isOpen),
      path: this.port?.path ?? null,
      baudRate: this.port?.settings?.baudRate ?? null,
      lastError: this.lastError,
    };
  }

  async connect(options = {}) {
    const path = String(options.path ?? "").trim();
    const baudRate = Number(options.baudRate ?? DEFAULT_BAUD_RATE);

    if (!path) throw new Error("Selecione uma porta serial.");
    if (!Number.isInteger(baudRate) || baudRate <= 0) throw new Error("Baud rate inválido.");

    await this.disconnect();
    this.lastError = null;

    const port = new SerialPort({ path, baudRate, autoOpen: false });

    await new Promise((resolve, reject) => {
      port.open((error) => error ? reject(error) : resolve());
    });

    port.on("data", (chunk) => {
      this.dataListener?.({
        receivedAt: new Date().toISOString(),
        rawHex: Buffer.from(chunk).toString("hex").toUpperCase(),
        rawText: Buffer.from(chunk).toString("utf8"),
      });
    });

    port.on("error", (error) => {
      this.lastError = error.message;
    });

    this.port = port;
    return this.getStatus();
  }

  async disconnect() {
    const port = this.port;
    this.port = null;

    if (!port?.isOpen) return this.getStatus();

    await new Promise((resolve) => {
      port.close(() => resolve());
    });

    return this.getStatus();
  }
}

module.exports = { ScaleService };
