const { SerialPort } = require("serialport");

const DEFAULT_SETTINGS = Object.freeze({
  baudRate: 2400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  rtscts: false,
  xon: false,
  xoff: false,
});

const ALLOWED_DATA_BITS = new Set([7, 8]);
const ALLOWED_STOP_BITS = new Set([1, 2]);
const ALLOWED_PARITY = new Set(["none", "even", "odd"]);

function normalizeBoolean(value) {
  return value === true;
}

function parseHexCommand(value) {
  const compact = String(value ?? "")
    .replace(/0x/gi, "")
    .replace(/[\s,;:-]+/g, "")
    .trim();

  if (!compact) throw new Error("Informe os bytes HEX que deseja enviar.");
  if (!/^[0-9a-f]+$/i.test(compact) || compact.length % 2 !== 0) {
    throw new Error("HEX inválido. Use pares como: 05 ou 02 31 0D 0A.");
  }

  return Buffer.from(compact, "hex");
}

class ScaleService {
  constructor() {
    this.port = null;
    this.dataListener = null;
    this.lastError = null;
    this.settings = { ...DEFAULT_SETTINGS };
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
      pnpId: port.pnpId ?? null,
    }));
  }

  getStatus() {
    return {
      connected: Boolean(this.port?.isOpen),
      path: this.port?.path ?? null,
      settings: { ...this.settings },
      lastError: this.lastError,
    };
  }

  normalizeSettings(options = {}) {
    const baudRate = Number(options.baudRate ?? DEFAULT_SETTINGS.baudRate);
    const dataBits = Number(options.dataBits ?? DEFAULT_SETTINGS.dataBits);
    const stopBits = Number(options.stopBits ?? DEFAULT_SETTINGS.stopBits);
    const parity = String(options.parity ?? DEFAULT_SETTINGS.parity).toLowerCase();

    if (!Number.isInteger(baudRate) || baudRate < 300 || baudRate > 921600) {
      throw new Error("Baud rate inválido.");
    }
    if (!ALLOWED_DATA_BITS.has(dataBits)) throw new Error("Data bits inválido.");
    if (!ALLOWED_STOP_BITS.has(stopBits)) throw new Error("Stop bits inválido.");
    if (!ALLOWED_PARITY.has(parity)) throw new Error("Paridade inválida.");

    return {
      baudRate,
      dataBits,
      stopBits,
      parity,
      rtscts: normalizeBoolean(options.rtscts),
      xon: normalizeBoolean(options.xon),
      xoff: normalizeBoolean(options.xoff),
    };
  }

  async connect(options = {}) {
    const path = String(options.path ?? "").trim();
    if (!path) throw new Error("Selecione uma porta serial.");

    const settings = this.normalizeSettings(options);
    await this.disconnect();
    this.lastError = null;

    const port = new SerialPort({
      path,
      ...settings,
      autoOpen: false,
    });

    await new Promise((resolve, reject) => {
      port.open((error) => error ? reject(error) : resolve());
    });

    port.on("data", (chunk) => {
      const buffer = Buffer.from(chunk);
      this.dataListener?.({
        direction: "rx",
        receivedAt: new Date().toISOString(),
        byteLength: buffer.length,
        rawHex: buffer.toString("hex").toUpperCase().match(/.{1,2}/g)?.join(" ") ?? "",
        rawText: buffer.toString("utf8"),
      });
    });

    port.on("error", (error) => {
      this.lastError = error.message;
    });

    port.on("close", () => {
      if (this.port === port) this.port = null;
    });

    this.port = port;
    this.settings = settings;
    return this.getStatus();
  }

  async send({ mode = "ascii", value = "" } = {}) {
    if (!this.port?.isOpen) throw new Error("Conecte a balança antes de enviar um comando.");

    const normalizedMode = String(mode).toLowerCase();
    let buffer;

    if (normalizedMode === "hex") {
      buffer = parseHexCommand(value);
    } else if (normalizedMode === "ascii") {
      const text = String(value ?? "");
      if (!text.length) throw new Error("Informe o comando ASCII que deseja enviar.");
      buffer = Buffer.from(text, "utf8");
    } else {
      throw new Error("Modo de envio inválido.");
    }

    await new Promise((resolve, reject) => {
      this.port.write(buffer, (error) => {
        if (error) return reject(error);
        this.port.drain((drainError) => drainError ? reject(drainError) : resolve());
      });
    });

    const payload = {
      direction: "tx",
      receivedAt: new Date().toISOString(),
      byteLength: buffer.length,
      rawHex: buffer.toString("hex").toUpperCase().match(/.{1,2}/g)?.join(" ") ?? "",
      rawText: buffer.toString("utf8"),
    };

    this.dataListener?.(payload);
    return payload;
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

module.exports = { ScaleService, DEFAULT_SETTINGS };
