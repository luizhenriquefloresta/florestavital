# CORS e Google Apps Script

## O problema

O site (GitHub Pages, ex.: `https://sraphaz.github.io/florestavital/`) chama o Google Apps Script (ex.: `https://script.google.com/macros/s/.../exec`) pelo navegador. O **Google Apps Script não permite definir** o cabeçalho `Access-Control-Allow-Origin` na resposta. Sem esse cabeçalho, o navegador **bloqueia** a resposta por política CORS e aparece um erro como:

- *"Access to fetch at 'https://script.google.com/...' from origin 'https://sraphaz.github.io' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present"*

---

## Antes de tudo: URL correta no config.js

No **js/config.js**, a variável `COMPRAS_COLETIVAS_API` deve ter a **URL real** do Web App (a que termina em `/exec`), **não** o texto `SUA_URL_DO_WEB_APP`. Se ainda estiver com o placeholder, o erro pode ser de URL inválida e não só de CORS.

---

## Solução recomendada: proxy CORS (Cloudflare Workers, grátis)

Como o Apps Script não envia CORS, use um **proxy** que recebe as requisições do site, repassa para o Apps Script e **devolve a resposta com os cabeçalhos CORS**. Assim o navegador aceita a resposta.

Foi incluído um script de proxy em **workers/cors-proxy.js** para **Cloudflare Workers** (plano grátis).

### Passos

1. **Conta Cloudflare**  
   Crie uma em [dash.cloudflare.com](https://dash.cloudflare.com) (se ainda não tiver).

2. **Criar um Worker**  
   Workers → Create Worker → dê um nome (ex.: `florestavital-proxy`).

3. **Colar o código**  
   Abra o arquivo **workers/cors-proxy.js** deste repositório, copie todo o conteúdo e cole no editor do Worker (substituindo o código padrão). Salve e faça **Deploy**.

4. **Configurar a URL do Apps Script**  
   No Worker: **Settings** → **Variables** → **Add variable**:
   - **Variable name:** `SCRIPT_URL`
   - **Value:** a URL do seu Web App (ex.: `https://script.google.com/macros/s/AKfycb.../exec`)

   Salve e faça **Deploy** de novo.

5. **Usar a URL do Worker no site**  
   No repositório do site, em **js/config.js**, coloque a **URL do Worker** (ex.: `https://florestavital-proxy.SEU_SUBDOMINIO.workers.dev`) em `COMPRAS_COLETIVAS_API`:

   ```javascript
   var COMPRAS_COLETIVAS_API = 'https://florestavital-proxy.SEU_SUBDOMINIO.workers.dev';
   ```

6. **Commit e push**  
   Faça commit do `config.js` e push. O site passará a chamar o Worker, que encaminha para o Apps Script e devolve a resposta com CORS.

---

## Resumo

| Situação | O que fazer |
|----------|-------------|
| Erro de CORS ao abrir o site no GitHub Pages | Usar o proxy (workers/cors-proxy.js) no Cloudflare Workers e colocar a URL do Worker em **js/config.js** |
| URL ainda é SUA_URL_DO_WEB_APP | Trocar em **js/config.js** pela URL real do Web App (ou pela URL do proxy, se já tiver configurado o Worker) |

O proxy não guarda dados; só encaminha GET/POST para o Apps Script e adiciona os cabeçalhos CORS na resposta.
