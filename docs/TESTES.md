# Testes do projeto

Os testes usam **Jest** e estão organizados por parte do projeto.

## Executar

```bash
npm install
npm test
```

Para rodar em modo watch (re-executa ao salvar):

```bash
npm run test:watch
```

## O que é testado

### 1. Apps Script (`google-apps-script/`)

- **utils.js** – funções puras `normalizePhone` e `phonesMatch` (telefone).
- Os mesmos comportamentos estão em **Code.gs**; `utils.js` existe para rodar testes em Node. Ao alterar `normalizePhone` ou `phonesMatch` no Code.gs, atualize `utils.js` e os testes.
- **.claspignore** garante que `utils.js` e a pasta `__tests__` não sejam enviados ao Google (só `Code.gs` e `appsscript.json`).

### 2. Tema (`js/theme.js`)

- Inicialização sem gravar no localStorage (respeita preferência do sistema).
- Botão do tema recebe ícone (lua/sol).
- Clique no botão alterna o atributo `data-theme` no documento.

### 3. Worker CORS (`workers/cors-proxy.js`)

- Testes de fumaça: presença de `fetch`, uso de `env.SCRIPT_URL`, cabeçalhos CORS, tratamento de OPTIONS e formato ES module.

## CI

O workflow **Testes** (`.github/workflows/test.yml`) roda `npm test` em cada push e em pull requests.
