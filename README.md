# Renascer Pesagem

Aplicativo desktop do ecossistema Renascer para integração com balanças Filizola e lançamento seguro de pesagens em comandas.

## Responsabilidade

O aplicativo local é uma ponte de hardware. Ele lê a balança e envia **peso + produto + comanda + identificador idempotente** para a API do Renascer.

O aplicativo **não é autoridade de preço** e nunca deve conter `SUPABASE_SECRET_KEY`, service role ou outra credencial privilegiada do Supabase.

Fluxo previsto:

```text
Filizola
  -> Renascer Pesagem
  -> API segura Renascer
  -> valida produto/preço por kg
  -> calcula valor no backend
  -> Comanda
  -> Supabase Realtime
  -> Operação Renascer
```

## Stack

- Electron
- React 19
- Vite
- JavaScript
- CSS Modules
- SerialPort

## Desenvolvimento

```bash
npm install
npm run dev
```

## Gerar executável Windows

```bash
npm install
npm run dist:win
```

A pasta `release/` terá:

- instalador NSIS do Renascer Pesagem;
- versão portátil `.exe`, útil para o primeiro teste na padaria sem instalar permanentemente.

## Modo diagnóstico da Filizola

A versão atual foi preparada para o teste físico da balança. Ela permite:

- listar portas COM;
- visualizar fabricante, VID/PID e número de série do adaptador;
- configurar baud rate, data bits, stop bits e paridade;
- configurar RTS/CTS e XON/XOFF;
- capturar bytes RX em texto e hexadecimal;
- enviar manualmente comandos ASCII ou HEX quando o protocolo do modelo confirmar transmissão sob demanda;
- registrar TX e RX com horário;
- exportar a sessão para um arquivo `.txt`.

O aplicativo mantém até 1.000 blocos recentes na tela. Para uma captura útil, faça várias pesagens conhecidas e exporte o arquivo antes de encerrar.

O roteiro completo está em [`docs/TESTE_BALANCA.md`](docs/TESTE_BALANCA.md).

## Segurança

- `contextIsolation` habilitado.
- `nodeIntegration` desabilitado.
- A serial é acessada somente pelo processo principal do Electron.
- O renderer recebe apenas uma API limitada via `preload`.
- Nenhuma chave privilegiada do Supabase deve existir neste repositório.
- O preço final de produto por peso será calculado pelo backend do Renascer.

## Status

O backend de pesagem no sistema Renascer já está preparado. O protocolo exato da Filizola será implementado após identificação do modelo, interface física e amostras reais capturadas pelo modo diagnóstico.
