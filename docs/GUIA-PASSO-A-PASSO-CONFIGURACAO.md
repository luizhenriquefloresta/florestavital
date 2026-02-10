# Guia passo a passo — Deixar o site e a Compra Coletiva no ar

Este guia é para quem **não mexe com tecnologia** e quer deixar tudo funcionando: o site publicado na internet e a **Compra Coletiva** (formulário onde as pessoas entram com o celular e fazem pedidos).  
Siga na ordem. Se algo não aparecer como descrito, anote em qual passo parou e peça ajuda.

---

## O que você vai fazer em resumo

1. **Criar uma planilha no Google** com três abas — aí ficarão os itens à venda, os cadastros e os pedidos.
2. **Ligar um “conector” (Apps Script)** à planilha — é isso que faz o site falar com a planilha.
3. **Copiar uma URL** que o Google vai te dar e **colar em um arquivo do projeto** no GitHub.
4. **Ativar a publicação do site** no GitHub (GitHub Pages), se ainda não estiver ativa.

No fim, o site estará no ar e a Compra Coletiva funcionando (login por celular, pedidos e área de configuração só para você).

---

# PARTE 1 — Criar a planilha no Google

Você pode fazer de **dois jeitos**:

- **Opção A (recomendado) — Automático:** criar só uma planilha **em branco**, dar um nome a ela e, na **PARTE 2**, depois de colar o código do Apps Script, **rodar uma função** que cria sozinha as três abas (Items, Users, Orders), os cabeçalhos e alguns itens de exemplo.  
  → Se escolher isso, faça só o **Passo 1.1** abaixo e depois vá para a **PARTE 2**. No final da Parte 2 há o **Passo 2.3** "Rodar a função que cria as abas".

- **Opção B — Manual:** criar a planilha e preencher cada aba e cada cabeçalho na mão (Passos 1.1 a 1.4).

---

## Passo 1.1 — Abrir e criar a planilha

1. Abra o navegador (Chrome, Edge, etc.) e entre no **Google** com sua conta.
2. Acesse: **https://sheets.google.com**
3. Clique no botão **+ Em branco** (ou “Blank”) para criar uma planilha nova.
4. No topo, onde está escrito “Planilha sem título”, clique e dê um nome, por exemplo: **Compra Coletiva Floresta Vital**.

**Se você escolheu a Opção A (automático), pare aqui e vá para a PARTE 2.** Depois de colar o código, use o Passo 2.3 para rodar a função que cria as abas.

**Se você escolheu a Opção B (manual), continue nos passos abaixo.**

---

## Passo 1.2 — Primeira aba: **Items** (lista de produtos)

1. Na parte de **baixo** da tela você vê uma aba chamada “Página1” ou “Planilha1”. Clique com o **botão direito** nessa aba.
2. Escolha **Renomear**.
3. Apague o nome atual e digite exatamente: **Items** (com I maiúsculo e o resto minúsculo). Confirme.
4. Você está na aba **Items**. Na **primeira linha**, preencha cada célula assim (clique na célula, digite e dê Enter):

   - Célula **A1**: digite **id**
   - Célula **B1**: digite **nome**
   - Célula **C1**: digite **unidade**
   - Célula **D1**: digite **ativo**
   - Célula **E1**: digite **estoque**
   - Célula **F1**: digite **preco**
   - Célula **G1**: digite **ordem**

5. A partir da **segunda linha**, cadastre os produtos. Exemplo (você pode mudar os nomes e quantidades):

   - **A2**: arroz  
   - **B2**: Arroz integral  
   - **C2**: kg  
   - **D2**: TRUE  
   - **E2**: 50  
   - **F2**: 0  
   - **G2**: 1  

   Repita para outros itens (feijão, azeite, ovos, etc.).  
   **Importante:** na coluna **D** use sempre **TRUE** para o item aparecer no site, ou **FALSE** para esconder. Na coluna **E** coloque a quantidade em estoque (número).

## Passo 1.3 — Segunda aba: **Users** (quem se cadastrou)

1. Clique no **+** ao lado da aba “Items” (ou em **Inserir** → **Folha**) para criar uma nova aba.
2. Clique com o botão direito no nome da nova aba → **Renomear** → digite exatamente: **Users**.
3. Na **primeira linha** dessa aba, preencha:
   - **A1**: telefone  
   - **B1**: nome  
   - **C1**: endereco  
   - **D1**: documento  

   Não precisa preencher as linhas abaixo: o sistema preenche quando alguém se cadastrar pelo site.

## Passo 1.4 — Terceira aba: **Orders** (pedidos)

1. Crie **mais uma aba** (botão **+** ao lado de “Users”).
2. Renomeie para exatamente: **Orders**.
3. Na **primeira linha** dessa aba, preencha:
   - **A1**: orderId  
   - **B1**: timestamp  
   - **C1**: nome  
   - **D1**: email  
   - **E1**: telefone  
   - **F1**: bairro  
   - **G1**: observacoes  
   - **H1**: itens  

   As linhas de pedidos serão preenchidas sozinhas quando alguém fizer um pedido no site.

4. **Salve** a planilha (Ctrl+S ou ela salva sozinha no Google).

---

# PARTE 2 — Instalar o “conector” (Apps Script) na planilha

O Apps Script é o que faz o site enviar e receber dados da sua planilha. Você vai colar um código que já está pronto no projeto.

## Passo 2.1 — Abrir o Apps Script

1. Com a planilha aberta, no menu do topo clique em **Extensões**.
2. Clique em **Apps Script**.
3. Abre uma nova aba com um editor. Pode aparecer uma mensagem de boas-vindas; feche se quiser.
4. À esquerda você vê um arquivo chamado **Code.gs**. Clique nele. À direita aparece um texto (código). **Selecione todo esse texto** (Ctrl+A) e **apague** (Delete).

## Passo 2.2 — Colar o código do projeto

1. No seu computador, abra a **pasta do projeto** do site (a que você baixou ou clonou do GitHub).
2. Entre na pasta **google-apps-script**.
3. Abra o arquivo **Code.gs** com o Bloco de notas (botão direito → Abrir com → Bloco de notas).
4. Selecione **todo** o conteúdo (Ctrl+A) e **copie** (Ctrl+C).
5. Volte à aba do navegador onde está o Apps Script (editor do Google).
6. Clique na área em branco onde estava o código e **cole** (Ctrl+V).
7. Clique no ícone de **disquete** (Salvar) ou use Ctrl+S. O nome do projeto em cima pode ser algo como “Código sem título”; pode deixar assim ou renomear para “Compra Coletiva”.

## Passo 2.3 — Rodar a função que cria as abas (só se você escolheu a Opção A na Parte 1)

Se você criou só uma planilha em branco e quer que o script crie as abas sozinho:

1. No editor do Apps Script, no menu do topo clique em **Executar** (ou "Run").
2. No menu que abre, escolha a função **runSetupPlanilha** (e não "doGet" nem "doPost").
3. Clique no botão **Executar** (ícone de play).
4. Na primeira vez o Google pode pedir **Autorizar**. Clique em **Revisar permissões**, escolha sua conta, depois em **Avançado** e **Ir para ... (não seguro)** e **Permitir**.
5. Ao terminar, deve aparecer uma mensagem do tipo "Pronto! Abas Items, Users e Orders criadas."
6. Volte à **aba da planilha** no navegador e atualize a página (F5). Você deve ver as três abas (Items, Users, Orders) com os cabeçalhos e alguns itens de exemplo em Items.

Depois disso, continue no Passo 2.4 para criar a senha de admin.

## Passo 2.4 — Criar sua “senha de admin” (token)

Essa “senha” só serve para **você** acessar a página de configuração da Compra Coletiva no site. Não vai no site para o público; fica só guardada no Google.

1. No editor do Apps Script, à **esquerda**, clique no ícone de **engrenagem** (Configurações do projeto). Se não vir, clique nas **três risquinhas** (menu) e depois em **Configurações do projeto**.
2. Role até a parte **Propriedades do script** (ou “Script properties”).
3. Clique em **Adicionar propriedade do script** (ou “Add script property”).
4. Onde pede **Propriedade**, digite exatamente: **ADMIN_TOKEN**
5. Onde pede **Valor**, digite uma **senha forte** que só você vai saber. Exemplo: **MinhaS3nhaCompraColetiva2025!** (invente a sua, com letras, números e símbolos, umas 15–20 caracteres).
6. Clique em **Salvar** (ou “Save script properties”).
7. **Anote essa senha** num lugar seguro (bloco de notas, e-mail para você mesmo). Você vai usar só na página de “configuração” do site (admin).

---

# PARTE 3 — Publicar o conector e pegar a URL

Agora você “publica” o script para ele virar um link (URL) que o site vai usar.

## Passo 3.1 — Nova implantação (Web app)

1. No editor do Apps Script, no menu do topo clique em **Implantar**.
2. Clique em **Nova implantação**.
3. Onde está “Selecionar tipo”, clique no ícone ou no texto e escolha **Aplicativo da Web** (ou “Web app”).
4. Preencha:
   - **Descrição:** pode escrever **Compra Coletiva** (só para você identificar).
   - **Executar como:** deixe **Eu** (sua conta).
   - **Quem tem acesso:** escolha **Qualquer pessoa**.
5. Clique em **Implantar**.

## Passo 3.2 — Autorizar (primeira vez)

1. Pode aparecer uma janela pedindo para **Autorizar** o aplicativo. Clique em **Autorizar**.
2. Escolha sua **conta Google** (a mesma da planilha).
3. Se aparecer “O Google não verificou este app”: clique em **Avançado** e depois em **Ir para Compra Coletiva (ou o nome do seu projeto) (não seguro)**. Isso é normal para um app seu.
4. Clique em **Permitir** para dar as permissões (acesso à planilha).
5. Volta à tela do Apps Script. Deve aparecer uma caixa com **URL do aplicativo da Web** (ou “Web app URL”).  
   **Copie essa URL inteira** (clique nela, Ctrl+A, Ctrl+C). Ela começa com **https://script.google.com/macros/s/...** e termina em **/exec**.
6. **Cole essa URL** num Bloco de notas e guarde. Você vai colar no site no próximo passo.

---

# PARTE 4 — Colar a URL no projeto do site (GitHub)

O site precisa “saber” qual é o endereço do conector. Isso é feito editando um único arquivo no GitHub.

## Passo 4.1 — Abrir o repositório no GitHub

1. Abra o navegador e acesse: **https://github.com**
2. Faça login na sua conta (a que é dona do repositório do site).
3. Abra o repositório do projeto (por exemplo: **luizhenriquefloresta/florestavital** — troque pelo seu usuário e nome do repositório se for diferente).

## Passo 4.2 — Abrir o arquivo de configuração

1. Na lista de arquivos do repositório, entre na pasta **js** (clique nela).
2. Clique no arquivo **config.js**.

## Passo 4.3 — Editar e colar a URL

1. Clique no ícone de **lápis** (Edit this file), no canto direito da barra onde está o nome do arquivo.
2. Você verá uma linha parecida com:
   ```text
   var COMPRAS_COLETIVAS_API = 'https://script.google.com/macros/s/SUA_URL_DO_WEB_APP/exec';
   ```
3. **Apague** a parte que está entre aspas (não apague as aspas nem o resto da linha). Ou seja, apague só: `https://script.google.com/macros/s/SUA_URL_DO_WEB_APP/exec`
4. **Cole** no lugar a **URL que você copiou** do Apps Script (a que começa com https://script.google.com/... e termina em /exec).  
   A linha deve ficar assim (com a sua URL):
   ```text
   var COMPRAS_COLETIVAS_API = 'https://script.google.com/macros/s/AKfycb...sua-url-longa.../exec';
   ```
5. Role a página até o final e clique no botão verde **Commit changes** (ou “Confirmar alterações”).
6. Na janela que abrir, pode deixar o título como está e clicar de novo em **Commit changes**.

Pronto: o site passou a usar o “conector” da sua planilha.

---

# PARTE 5 — Ativar a publicação do site (GitHub Pages)

Assim o GitHub publica o site na internet. Se o site **já** está no ar, você pode pular esta parte.

## Passo 5.1 — Abrir as configurações de Pages

1. No repositório do projeto, clique na aba **Settings** (Configurações).
2. No menu da esquerda, clique em **Pages** (em “Code and automation” ou “Código e automação”).

## Passo 5.2 — Escolher de onde publicar

1. Em **Build and deployment** (Construir e implantar), onde está **Source** (Origem), clique no menu.
2. Escolha **Deploy from a branch** (Implantar a partir de um branch).
3. Em **Branch** (Branch), escolha **main** (ou o branch onde está o código do site).
4. Em **Folder** (Pasta), escolha **/ (root)**.
5. Clique em **Save** (Salvar).

## Passo 5.3 — Ver o site no ar

1. Depois de alguns minutos, no topo da mesma página de **Pages** deve aparecer uma caixa dizendo que o site está publicado, com um link. Algo como:  
   **Your site is live at https://seuusuario.github.io/nome-do-repo/**
2. Esse é o endereço do seu site. A **Compra Coletiva** fica em:  
   **https://seuusuario.github.io/nome-do-repo/compras-coletivas.html**  
   (troque usuário e nome-do-repo pelos seus).

---

# PARTE 6 — Onde está cada coisa e como testar

- **Site (página inicial):**  
  `https://seuusuario.github.io/nome-do-repo/`

- **Compra Coletiva (página que o público usa):**  
  `https://seuusuario.github.io/nome-do-repo/compras-coletivas.html`  
  Aqui a pessoa digita o celular, completa o perfil (se for a primeira vez) e faz o pedido.

- **Área de configuração (só para você — admin):**  
  `https://seuusuario.github.io/nome-do-repo/admin-compras-coletivas.html`  
  Não tem link no menu do site; só acessa quem souber o endereço. Na primeira vez você digita a **senha de admin** (o valor que colocou em ADMIN_TOKEN) e depois pode alterar itens, estoque e ver pedidos.

**Teste rápido:**  
1. Abra o link da Compra Coletiva no celular ou no PC.  
2. Digite um número de celular e avance.  
3. Se for a primeira vez, preencha nome e **e-mail** (e opcionalmente endereço e documento) e salve.  
4. Na tela "Confirme seu e-mail", clique em **Enviar código por e-mail**. Confira sua caixa de entrada (e spam) e digite o código de 6 dígitos; depois clique em **Verificar e continuar**.  
5. Escolha quantidades nos itens e envie o pedido.  
6. Veja na planilha na aba **Orders** se apareceu uma nova linha com o pedido, e na aba **Users** se apareceu o cadastro.

---

# Resumo do que você fez

| O quê | Onde |
|------|------|
| Lista de itens e estoque | Planilha Google → aba **Items** |
| Cadastros (celular, nome, etc.) | Planilha Google → aba **Users** (preenchida pelo site) |
| Pedidos | Planilha Google → aba **Orders** (preenchida pelo site) |
| Conector (site ↔ planilha) | Google Apps Script (Extensões na planilha) |
| Senha da área de configuração | Apps Script → Propriedades do projeto → **ADMIN_TOKEN** |
| URL do conector | Colada no arquivo **js/config.js** no GitHub |
| Site no ar | GitHub → Settings → Pages (Deploy from branch **main**, pasta **/ (root)**) |

Se algo der errado (por exemplo: “Não foi possível carregar os itens” ou pedido não aparece na planilha), confira:  
- se as três abas **Items**, **Users** e **Orders** existem e com os nomes **exatamente** assim;  
- se a URL no **config.js** é a mesma que está no Apps Script (sem espaço no início ou no fim);  
- se você fez **Implantar** de novo no Apps Script depois de mudar o código ou a planilha.

Para mais detalhes técnicos (CORS, testes locais, etc.), use o **docs/SETUP-DEPLOY-COMPRAS-COLETIVAS.md**.
