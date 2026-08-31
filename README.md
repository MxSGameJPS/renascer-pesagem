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

## Segurança

- `contextIsolation` habilitado.
- `nodeIntegration` desabilitado.
- A serial é acessada somente pelo processo principal do Electron.
- O renderer recebe apenas uma API limitada via `preload`.
- Nenhuma chave privilegiada do Supabase deve existir neste repositório.
- O preço final de produto por peso será calculado pelo backend do Renascer.

## Status

Estrutura inicial do projeto. O protocolo exato da Filizola será implementado somente após identificação do modelo, interface e amostras reais da comunicação da balança.
