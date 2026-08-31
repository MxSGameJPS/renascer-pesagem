import { useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";

const DEFAULT_BAUD_RATE = 9600;

export default function App() {
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState("");
  const [baudRate, setBaudRate] = useState(DEFAULT_BAUD_RATE);
  const [status, setStatus] = useState({ connected: false, path: null, baudRate: null, lastError: null });
  const [samples, setSamples] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPortInfo = useMemo(
    () => ports.find((port) => port.path === selectedPort) ?? null,
    [ports, selectedPort]
  );

  async function refreshPorts() {
    setBusy(true);
    setMessage("");
    try {
      const nextPorts = await window.renascer.scale.listPorts();
      setPorts(nextPorts);
      if (!selectedPort && nextPorts.length === 1) setSelectedPort(nextPorts[0].path);
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
      const nextStatus = await window.renascer.scale.connect({ path: selectedPort, baudRate });
      setStatus(nextStatus);
      setMessage(`Conectado à ${nextStatus.path}.`);
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
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refreshPorts();
    window.renascer.scale.status().then(setStatus);
    const unsubscribe = window.renascer.scale.onData((payload) => {
      setSamples((current) => [payload, ...current].slice(0, 20));
    });
    return unsubscribe;
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>RENASCER PADARIA E CONFEITARIA</span>
          <h1>Pesagem</h1>
          <p>Diagnóstico inicial da comunicação com a balança.</p>
        </div>
        <strong data-connected={status.connected}>{status.connected ? "BALANÇA CONECTADA" : "DESCONECTADA"}</strong>
      </header>

      {message && <div className={styles.message}>{message}</div>}

      <section className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardTitle}>
            <div><small>ETAPA 1</small><h2>Porta serial</h2></div>
            <button type="button" onClick={refreshPorts} disabled={busy}>Atualizar portas</button>
          </div>

          <label>
            <span>Porta COM</span>
            <select value={selectedPort} onChange={(event) => setSelectedPort(event.target.value)} disabled={status.connected}>
              <option value="">Selecione</option>
              {ports.map((port) => <option key={port.path} value={port.path}>{port.path}{port.manufacturer ? ` · ${port.manufacturer}` : ""}</option>)}
            </select>
          </label>

          <label>
            <span>Baud rate</span>
            <select value={baudRate} onChange={(event) => setBaudRate(Number(event.target.value))} disabled={status.connected}>
              {[1200, 2400, 4800, 9600, 19200, 38400].map((value) => <option value={value} key={value}>{value}</option>)}
            </select>
          </label>

          {selectedPortInfo && (
            <div className={styles.portInfo}>
              <span>Fabricante: <b>{selectedPortInfo.manufacturer || "não informado"}</b></span>
              <span>VID/PID: <b>{selectedPortInfo.vendorId || "-"}/{selectedPortInfo.productId || "-"}</b></span>
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
            <div><small>ETAPA 2</small><h2>Dados da balança</h2></div>
            <button type="button" onClick={() => setSamples([])} disabled={!samples.length}>Limpar</button>
          </div>

          <p className={styles.help}>Nesta primeira versão mostramos os bytes exatamente como chegam. Ainda não interpretamos peso porque o protocolo da Filizola precisa ser confirmado no equipamento real.</p>

          <div className={styles.samples}>
            {samples.length === 0 && <p>Nenhum dado recebido ainda.</p>}
            {samples.map((sample, index) => (
              <div key={`${sample.receivedAt}-${index}`}>
                <time>{new Date(sample.receivedAt).toLocaleTimeString("pt-BR")}</time>
                <code>{sample.rawText || "(sem texto legível)"}</code>
                <small>{sample.rawHex}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className={styles.footer}>
        <span>Próximo passo: identificar o protocolo da Filizola e conectar à API segura de comandas.</span>
      </footer>
    </main>
  );
}
