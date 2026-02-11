# Deploy automático do Apps Script (clasp + GitHub Actions)

Com essa configuração, cada **push na branch `main`** que alterar arquivos em `google-apps-script/` dispara o envio do código para o seu projeto Google Apps Script (o script vinculado à planilha da Compra Coletiva).

## Pré-requisitos

1. **Projeto Apps Script já existente** – o que está vinculado à sua planilha (você já criou pelo menu Extensões → Apps Script).
2. **Conta Google** com acesso a esse projeto.

## Configuração (uma vez)

### 1. Ativar a API do Apps Script

- Acesse: https://script.google.com/home/usersettings  
- Ative **Google Apps Script API**.

### 2. Instalar clasp e fazer login

No seu computador (Node.js instalado):

```bash
npm install -g @google/clasp
clasp login
```

Abra o link no navegador, autorize com a conta que usa no Apps Script. Isso gera o arquivo de credenciais em:

- **Windows:** `%USERPROFILE%\.clasprc.json`
- **Linux/macOS:** `~/.clasprc.json`

### 3. Obter o Script ID

- Abra a planilha → **Extensões** → **Apps Script**.
- Na barra de endereço aparece: `https://script.google.com/home/projects/XXXXXXXXXX/edit`
- O **Script ID** é o `XXXXXXXXXX` (uma longa string).

### 4. Configurar os secrets no GitHub

No repositório do GitHub:

1. **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** para cada um:

| Nome do secret   | Valor |
|------------------|--------|
| `CLASP_SCRIPT_ID` | O Script ID do passo 3 (só o ID, sem aspas). |
| `CLASPRC_JSON`   | O **conteúdo completo** do arquivo `.clasprc.json` (o que foi gerado no passo 2). Copie e cole todo o JSON. |

Para copiar o conteúdo do `.clasprc.json`:

- **Windows (PowerShell):** `Get-Content $env:USERPROFILE\.clasprc.json | Set-Clipboard`
- **Linux/macOS:** `cat ~/.clasprc.json` (copie a saída)

**Importante:** não commite o arquivo `.clasprc.json` no Git; ele contém tokens de acesso. O `.gitignore` já evita isso.

## O que acontece no deploy

- O workflow **Deploy Apps Script** roda em cada push em `main` que altere algo em `google-apps-script/`.
- Ele usa os secrets para autenticar e faz um **`clasp push`**: envia o conteúdo de `google-apps-script/` (por exemplo, `Code.gs` e `appsscript.json`) para o projeto Apps Script.
- O código no editor do Apps Script é **atualizado**. A **URL do Web App** não muda.
- Para que os usuários passem a usar essa versão, você ainda precisa **publicar uma nova versão** do deployment no Apps Script (Implantar → Gerenciar implantações → Editar → Nova versão → Implantar). O clasp só atualiza o código; a “versão” do deployment é definida no Google.

### E o Cloudflare (proxy CORS)?

Se você usa um Worker no Cloudflare com a variável **SCRIPT_URL** apontando para o Web App, **não precisa alterar nada** quando faz deploy automático ou publica nova versão: a URL do Web App é a mesma. Só seria preciso atualizar o **SCRIPT_URL** no Cloudflare (e o `js/config.js`, se usar URL direta) se você criar um **deployment totalmente novo** no Apps Script (o que gera uma URL nova). No dia a dia, nova versão = mesma URL.

## Executar o deploy manualmente

No GitHub: **Actions** → **Deploy Apps Script** → **Run workflow** → **Run workflow**.

## Desenvolvimento local (opcional)

Para testar push/pull no seu PC sem usar o GitHub:

1. Copie o exemplo de configuração:
   ```bash
   cp .clasp.json.example .clasp.json
   ```
2. Edite `.clasp.json` e substitua `scriptId` pelo seu Script ID.
3. Envie o código:
   ```bash
   npx clasp push
   ```

O arquivo `.clasp.json` não será commitado (está no `.gitignore`).
