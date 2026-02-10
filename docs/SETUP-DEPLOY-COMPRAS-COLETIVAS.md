# Setup e deploy — Compra Coletiva (Google Sheets + Apps Script)

## 1. Criar a planilha Google

1. Acesse [Google Sheets](https://sheets.google.com) e crie uma **nova planilha**.
2. Renomeie a primeira aba para **Items** (nome exato).
3. Na aba **Items**, na primeira linha (cabeçalho), preencha:
   - A1: `id`
   - B1: `nome`
   - C1: `unidade`
   - D1: `ativo`
   - E1: `estoque`
   - F1: `preco`
   - G1: `ordem`
   - H1: `imagem` (opcional — URL pública da foto do item)
4. A partir da linha 2, cadastre os itens. Exemplo:

   | id   | nome                    | unidade | ativo | estoque | preco | ordem | imagem |
   |------|--------------------------|--------|-------|---------|-------|-------|--------|
   | arroz | Arroz integral           | kg     | TRUE  | 50      | 0     | 1     | (URL)  |
   | feijao | Feijão                  | kg     | TRUE  | 30      | 0     | 2     |        |
   | azeite | Azeite extra virgem     | un     | TRUE  | 20      | 0     | 3     |        |

   - **ativo:** `TRUE` = aparece na página pública; `FALSE` = oculto.
   - **estoque:** número inteiro; o sistema debita ao registrar pedido.
   - **preco** e **ordem:** opcionais (podem ser 0).
   - **imagem:** URL pública da imagem do item (ex.: link do Google Drive em “qualquer pessoa com o link”, ou Imgur). Se vazio, o item aparece sem foto. O painel admin permite editar essa URL.

5. Crie uma **segunda aba** e renomeie para **Users** (nome exato). Na primeira linha:
   - A1: `telefone`
   - B1: `nome`
   - C1: `endereco`
   - D1: `documento`
   - E1: `email`
   As linhas serão preenchidas quando alguém se cadastrar (login por celular + perfil). O e-mail é usado para enviar o código de verificação antes do pedido.

6. Crie uma **terceira aba** e renomeie para **Orders** (nome exato).
7. Na aba **Orders**, primeira linha:
   - A1: `orderId`
   - B1: `timestamp`
   - C1: `nome`
   - D1: `email`
   - E1: `telefone`
   - F1: `bairro`
   - G1: `observacoes`
   - H1: `itens`
   - I1: `status` (obrigatório para Separado/Entregue no admin; valores: ativo, separado, entregue, cancelado)

As linhas de pedidos serão preenchidas automaticamente pelo script. O campo **email** pode ficar vazio (é opcional no pedido). Se a planilha já existia sem a coluna **status**, use no menu da planilha **Compra Coletiva** → **Garantir coluna Status na aba Orders** (ou execute **runGarantirColunaStatus** no Apps Script).

Para **separar pedidos** em linhas (um item por linha, com nome, telefone, quantidade, valor e total), use o menu **Compra Coletiva** → **Atualizar Separação** na planilha; o script criará as abas **Separação** (visão geral) e **Separação por pedido**. Detalhes em [SEPARACAO-PEDIDOS.md](SEPARACAO-PEDIDOS.md).

---

## 2. Adicionar o Apps Script à planilha

1. Na planilha, menu **Extensões** → **Apps Script**.
2. Apague o conteúdo do arquivo `Code.gs` que aparece e **cole todo o conteúdo** do arquivo `google-apps-script/Code.gs` deste repositório.
3. Salve (Ctrl+S ou ícone de disco).

---

## 3. Configurar o token de administrador

1. No editor do Apps Script, no menu **Executar** (ou **Project settings** no painel esquerdo), abra **Propriedades do projeto** (ou **Script properties**).
2. Adicione uma propriedade:
   - **Nome:** `ADMIN_TOKEN`
   - **Valor:** uma senha longa e aleatória que só você conheça (ex.: gere com um gerador de senhas, 20+ caracteres).
3. Guarde esse valor em local seguro. **Apenas quem tem esse token** pode acessar a página de configuração (`admin-compras-coletivas.html`); não há outro tipo de usuário admin — o acesso é exclusivo por esse token.

---

## 4. Ajustar a origem CORS (se necessário)

No `Code.gs`, a função `jsonResponse` define:

```javascript
var origin = 'https://luizhenriquefloresta.github.io';
```

- Se o site estiver em **https://luizhenriquefloresta.github.io/florestavital/** ou em **https://seuusuario.github.io**, a origem é sempre `https://luizhenriquefloresta.github.io` (sem o caminho `/florestavital`). Não altere.
- Se o site estiver em outro domínio (ex.: custom domain), troque `origin` para esse domínio (ex.: `https://florestavital.com.br`).

---

## 5. Publicar como Web App

1. No editor do Apps Script, clique em **Implantar** → **Nova implantação**.
2. Ao lado de **Selecionar tipo**, clique em **Web app**.
3. Preencha:
   - **Descrição:** ex. "Compra Coletiva API"
   - **Executar como:** Eu (sua conta)
   - **Quem tem acesso:** Qualquer pessoa (o script valida token nos endpoints admin)
4. Clique em **Implantar**.
5. Na primeira vez, **Autorize o acesso**: clique em **Autorizar**, escolha sua conta Google e permita as permissões solicitadas.
6. Copie a **URL do Web app** (algo como `https://script.google.com/macros/s/AKfy.../exec`). Você usará essa URL no frontend.

---

## 6. Configurar a URL no site (frontend)

1. No repositório do site, abra o arquivo **js/config.js**.
2. Substitua o valor de `COMPRAS_COLETIVAS_API` pela URL do Web App que você copiou:

```javascript
var COMPRAS_COLETIVAS_API = 'https://script.google.com/macros/s/SUA_ID_AQUI/exec';
```

3. Salve e faça commit/push para o branch usado no GitHub Pages (ex.: `main` ou `feature/compras-coletivas-dinamico`).

---

## 7. Testar localmente

- O GitHub Pages só serve o site quando publicado. Para testar em sua máquina:
  1. Sirva os arquivos com um servidor local, por exemplo:
     - `npx serve .` (na raiz do projeto)
     - ou abra pelo VS Code com a extensão "Live Server"
  2. Acesse `http://localhost:3000/compras-coletivas.html` (ou a porta que o `serve` indicar).
  3. Se o Apps Script rejeitar por CORS (origem diferente), a origem permitida no script é só `https://luizhenriquefloresta.github.io`. Para testar de `http://localhost:3000`, você pode **temporariamente** no `Code.gs` trocar a origem para `http://localhost:3000`, implantar de novo e testar; depois volte a origem para o domínio do GitHub Pages.

---

## 8. Deploy do site no GitHub Pages

- Siga o **DEPLOY.md** do projeto (deploy a partir da branch `main`, pasta raiz).
- Após o push, o site estará em **https://luizhenriquefloresta.github.io/florestavital/**.
- A página pública da compra coletiva: **https://luizhenriquefloresta.github.io/florestavital/compras-coletivas.html**
- A área admin (não linkada no menu): **https://luizhenriquefloresta.github.io/florestavital/admin-compras-coletivas.html**

---

## 9. Deploy final (após alterações no código)

Sempre que houver mudanças no repositório ou no backend, faça:

1. **Git (site + docs)**  
   - Commit e push para o repositório (ex.: `main`).  
   - Se o site estiver em GitHub Pages a partir dessa branch, o push já publica o site (HTML/JS/CSS).

2. **Apps Script (backend)**  
   - Abra a planilha → **Extensões** → **Apps Script**.  
   - Substitua todo o conteúdo de `Code.gs` pelo conteúdo atual de **google-apps-script/Code.gs** do repositório.  
   - Salve (Ctrl+S).  
   - **Implantar** → **Gerenciar implantações** → no deployment existente, **Editar** (ícone de lápis) → **Versão** = **Nova versão** → **Implantar**.  
   - A URL do Web app não muda; o site continua usando a mesma URL em **js/config.js**.

3. **Opcional: proxy CORS**  
   - Se você usa um Worker (Cloudflare) como proxy, não é preciso alterar nada no Worker ao atualizar o Apps Script; a variável `SCRIPT_URL` já aponta para a mesma URL.

---

## Resumo rápido

| O quê              | Onde |
|--------------------|------|
| Planilha           | Google Drive (abas **Items** e **Orders**) |
| Código backend     | Extensões → Apps Script na mesma planilha |
| Token admin        | Propriedades do projeto do Apps Script → `ADMIN_TOKEN` |
| URL do backend     | Implantar → Web app → copiar URL → colar em **js/config.js** |
| Página pública     | compras-coletivas.html |
| Área admin         | admin-compras-coletivas.html (acesso direto pela URL + token) |
