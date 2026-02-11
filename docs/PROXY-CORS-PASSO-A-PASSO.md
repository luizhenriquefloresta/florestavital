# Proxy CORS — passo a passo rápido (~5 min)

O site em **sraphaz.github.io** não consegue chamar o Apps Script direto por causa de CORS. Use um **proxy** no Cloudflare (grátis). O site passa a chamar o proxy; o proxy chama o Apps Script e devolve a resposta com CORS.

---

## 1. Entrar no Cloudflare Workers

1. Abra **https://dash.cloudflare.com** e faça login (ou crie conta grátis).
2. No menu à esquerda, clique em **Workers & Pages**.
3. Clique em **Create** → **Create Worker**.

---

## 2. Colar o código do proxy

1. Dê um nome ao Worker (ex.: **florestavital-cors**).
2. Clique em **Deploy** (pode deixar o código de exemplo).
3. Depois do deploy, clique em **Edit code**.
4. **Apague todo** o código que está no editor.
5. Abra o arquivo **workers/cors-proxy.js** deste repositório (no seu PC), copie **todo** o conteúdo e cole no editor do Cloudflare.
6. Clique em **Save and deploy**.

---

## 3. Configurar a URL do Apps Script no Worker

1. Na página do Worker, vá em **Settings** → **Variables** (ou **Variables and Secrets**).
2. Em **Environment Variables**, clique em **Add variable** (ou **Edit variables**).
3. **Variable name:** `SCRIPT_URL` (exatamente assim).  
   **Value:** cole a URL do seu Web App (a que termina em `/exec`), por exemplo:  
   `https://script.google.com/macros/s/AKfycbwU0QIVt5nENIUAQffpFB9VKVbuB4QPosEwl_6jXCU8DHwRbtLdxD0EgSkjXI0BAtu75g/exec`
4. **Importante:** depois de salvar a variável, volte em **Code** e clique de novo em **Save and deploy**. Sem um novo deploy, a variável não vale para as próximas requisições.

---

## 4. Copiar a URL do Worker

1. Na página do Worker, em **Overview** (ou no topo), você vê algo como:  
   **https://florestavital-cors.SEU-USUARIO.workers.dev**
2. Copie essa URL **inteira** (sem barra no final).

---

## 5. Colocar a URL do Worker no site

1. No repositório do projeto, abra o arquivo **js/config.js**.
2. Troque a linha do `COMPRAS_COLETIVAS_API` para usar a **URL do Worker** (não mais a do script):

```javascript
var COMPRAS_COLETIVAS_API = 'https://florestavital-cors.SEU-USUARIO.workers.dev';
```

(Use a URL que você copiou no passo 4.)

3. Salve, faça commit e push. Quando o GitHub Pages atualizar, o site passará a usar o proxy e o CORS deixa de bloquear.

---

## Resumo

| Onde | O que fica |
|------|------------|
| **Cloudflare Worker** → variável `SCRIPT_URL` | URL do Apps Script (https://script.google.com/.../exec) |
| **js/config.js** → `COMPRAS_COLETIVAS_API` | URL do Worker (https://....workers.dev) |

O navegador chama o Worker → o Worker chama o Apps Script → a resposta volta com CORS e o site funciona.

---

## Se ainda der erro de CORS

- Confirme que a variável **SCRIPT_URL** está definida no Worker (Settings → Variables) e que você fez **Save and deploy** depois de salvar a variável.
- Em **js/config.js**, use só a URL do Worker, **sem path** (ex.: `https://cors-florestavital.rapha-sos.workers.dev`); o site já adiciona `?action=...` nas chamadas.
- Se o Worker foi alterado (código ou variáveis), faça um novo **Save and deploy** no Cloudflare.
