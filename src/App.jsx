import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";

const DEFAULT_SERIAL = {
  baudRate: 2400,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  rtscts: false,
  xon: false,
  xoff: false,
};

const MAX_SAMPLES = 1000;

function visibleText(value) {
  return JSON.stringify(value ?? "").slice(1, -1) || "(sem texto legível)";
}

export default function App() {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [serial, setSerial] = useState(DEFAULT_SERIAL);
  const [status, setStatus] = useState({ connected: false, path: null, settings: DEFAULT_SERIAL, lastError: null });
  const [samples, setSamples] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendMode, setSendMode] = useState("hex");
  const [command, setCommand] = useState("");

  const selectedPortInfo = useMemo(
    () => ports.find((port) => port.path === selectedPort) ?? null,
    [ports, selectedPort]
  );

  const totals = useMemo(() => ({
    chunks: samples.filter((sample) => sample.direction !== "tx").length,
    sent: samples.filter((sample) => sample.direction === "tx").length,
    bytes: samples.reduce((sum, sample) => sum + Number(sample.byteLength || 0), 0),
  }), [samples]);

  async function refreshPorts() {
    setBusy(true);
    setMessage("");
    try {
      const nextPorts = await window.renascer.scale.listPorts();
      setPorts(nextPorts);
      if (!selectedPort && nextPorts.length === 1) setSelectedPort(nextPorts[0].path);
      if (!nextPorts.length) setMessage("Nenhuma porta serial encontrada. Conecte o adaptador/cabo e tente novamente.");
    } catch (error) {
      setMessage(error.message || "Não foi possível listar as portas seriais.");
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const nextStatus = await window.renascer.scale.connect({ path: selectedPort, ...serial });
      setStatus(nextStatus);
      setSamples([]);
      setMessage(`Conectado à ${nextStatus.path}. Faça o teste sem peso, com peso e retirando o peso.`);
    } catch (error) {
      setMessage(error.message || "Não foi possível conectar à balança.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      setStatus(await window.renascer.scale.disconnect());
      setMessage("Balança desconectada.");
    } catch (error) {
      setMessage(error.message || "Não foi possível desconectar a porta.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCommand() {
    setBusy(true);
    setMessage("");
    try {
      await window.renascer.scale.send({ mode: sendMode, value: command });
      setMessage("Comando enviado. Observe se a balança respondeu na captura.");
    } catch (error) {
      setMessage(error.message || "Não foi possível enviar o comando.");
    } finally {
      setBusy(false);
    }
  }

  async function exportCapture() {
    try {
      const result = await window.renascer.diagnostics.exportCapture({
        port: status.path || selectedPort,
        settings: status.settings || serial,
        samples: [...samples].reverse(),
      });
      if (!result.canceled) setMessage(`Captura salva em ${result.filePath}`);
    } catch (error) {
      setMessage(error.message || "Não foi possível exportar a captura.");
    }
  }

  function updateSerial(field, value) {
    setSerial((current) => ({ ...current, [field]: value }));
  }

  useEffect(() => {
    refreshPorts();
    window.renascer.scale.status().then((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus?.settings) setSerial(nextStatus.settings);
    });
    const unsubscribe = window.renascer.scale.onData((payload) => {
      setSamples((current) => [payload, ...current].slice(0, MAX_SAMPLES));
    });
    return unsubscribe;
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>RENASCER PADARIA E CONFEITARIA</span>
          <h1>Diagnóstico da balança</h1>
          <p>Captura de comunicação serial para identificar o protocolo real da Filizola.</p>
        </div>
        <strong data-connected={status.connected}>{status.connected ? `CONECTADA · ${status.path}` : "DESCONECTADA"}</strong>
      </header>

      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.grid}>
        <div className={styles.leftColumn}>
          <article className={styles.card}>
            <div className={styles.cardTitle}>
              <div><small>ETAPA 1</small><h2>Porta e parâmetros</h2></div>
              <button type="button" onClick={refreshPorts} disabled={busy || status.connected}>Atualizar portas</button>
            </div>

            <label>
              <span>Porta COM</span>
              <select value={selectedPort} onChange={(event) => setSelectedPort(event.target.value)} disabled={status.connected}>
                <option value="">Selecione</option>
                {ports.map((port) => <option key={port.path} value={port.path}>{port.path}{port.manufacturer ? ` · ${port.manufacturer}` : ""}</option>)}
              </select>
            </label>

            <div className={styles.compactGrid}>
              <label>
                <span>Baud rate</span>
                <select value={serial.baudRate} onChange={(event) => updateSerial("baudRate", Number(event.target.value))} disabled={status.connected}>
                  {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>Data bits</span>
                <select value={serial.dataBits} onChange={(event) => updateSerial("dataBits", Number(event.target.value))} disabled={status.connected}>
                  {[7, 8].map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>Stop bits</span>
                <select value={serial.stopBits} onChange={(event) => updateSerial("stopBits", Number(event.target.value))} disabled={status.connected}>
                  {[1, 2].map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>
              <label>
                <span>Paridade</span>
                <select value={serial.parity} onChange={(event) => updateSerial("parity", event.target.value)} disabled={status.connected}>
                  <option value="none">Nenhuma</option>
                  <option value="even">Par</option>
                  <option value="odd">Ímpar</option>
                </select>
              </label>
            </div>

            <div className={styles.checks}>
              <label><input type="checkbox" checked={serial.rtscts} onChange={(event) => updateSerial("rtscts", event.target.checked)} disabled={status.connected} /> RTS/CTS</label>
              <label><input type="checkbox" checked={serial.xon} onChange={(event) => updateSerial("xon", event.target.checked)} disabled={status.connected} /> XON</label>
              <label><input type="checkbox" checked={serial.xoff} onChange={(event) => updateSerial("xoff", event.target.checked)} disabled={status.connected} /> XOFF</label>
            </div>

            {selectedPortInfo && (
              <div className={styles.portInfo}>
                <span>Fabricante: <b>{selectedPortInfo.manufacturer || "não informado"}</b></span>
                <span>VID/PID: <b>{selectedPortInfo.vendorId || "-"}/{selectedPortInfo.productId || "-"}</b></span>
                <span>Nº série: <b>{selectedPortInfo.serialNumber || "-"}</b></span>
              </div>
            )}

            <div className={styles.actions}>
              {!status.connected
                ? <button type="button" className={styles.primary} onClick={connect} disabled={busy || !selectedPort}>Conectar</button>
                : <button type="button" className={styles.danger} onClick={disconnect} disabled={busy}>Desconectar</button>}
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitle}>
              <div><small>ETAPA 2</small><h2>Envio manual</h2></div>
            </div>
            <p className={styles.help}>Use somente um comando confirmado no manual técnico do modelo. Algumas Filizola respondem apenas quando o computador solicita o peso.</p>
            <div className={styles.sendRow}>
              <select value={sendMode} onChange={(event) => setSendMode(event.target.value)} disabled={!status.connected}>
                <option value="hex">HEX</option>
                <option value="ascii">ASCII</option>
              </select>
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                disabled={!status.connected}
                placeholder={sendMode === "hex" ? "Ex.: 05 ou 02 31 0D 0A" : "Comando ASCII confirmado"}
              />
              <button type="button" onClick={sendCommand} disabled={busy || !status.connected || !command}>Enviar</button>
            </div>
          </article>

          <article className={styles.card}>
            <div className={styles.cardTitle}><div><small>ROTEIRO</small><h2>Teste rápido</h2></div></div>
            <ol className={styles.steps}>
              <li>Conecte o cabo e descubra qual COM aparece.</li>
              <li>Comece em 2400, 8 bits, 1 stop, sem paridade.</li>
              <li>Conecte e aguarde alguns segundos sem peso.</li>
              <li>Coloque um peso conhecido e depois retire.</li>
              <li>Se nada chegar, não chute comandos: confira o modelo/manual.</li>
              <li>Quando houver dados, faça 3 pesagens e exporte a captura.</li>
            </ol>
          </article>
        </div>

        <article className={styles.card}>
          <div className={styles.cardTitle}>
            <div><small>ETAPA 3</small><h2>Captura serial</h2></div>
            <div className={styles.captureActions}>
              <button type="button" onClick={exportCapture} disabled={!samples.length}>Exportar captura</button>
              <button type="button" onClick={() => setSamples([])} disabled={!samples.length}>Limpar</button>
            </div>
          </div>

          <div className={styles.metrics}>
            <span><b>{totals.chunks}</b> blocos RX</span>
            <span><b>{totals.sent}</b> envios TX</span>
            <span><b>{totals.bytes}</b> bytes</span>
          </div>

          <p className={styles.help}>RX é o que chegou da balança; TX é o que o aplicativo enviou. Texto e HEX são preservados para análise posterior.</p>

          <div className={styles.samples}>
            {samples.length === 0 && <p>Nenhum dado recebido ou enviado ainda.</p>}
            {samples.map((sample, index) => (
              <div key={`${sample.receivedAt}-${index}`} data-direction={sample.direction || "rx"}>
                <div className={styles.sampleMeta}>
                  <b>{sample.direction === "tx" ? "TX" : "RX"}</b>
                  <time>{new Date(sample.receivedAt).toLocaleTimeString("pt-BR", { hour12: false })}</time>
                  <span>{sample.byteLength} byte(s)</span>
                </div>
                <code>{visibleText(sample.rawText)}</code>
                <small>{sample.rawHex}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <span>Este modo apenas diagnostica a serial. O parser de peso será criado depois que capturarmos o protocolo real da balança.</span>
      </footer>
    </main>
  );
}
