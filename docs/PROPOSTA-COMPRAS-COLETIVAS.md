# Compra Coletiva — Diagnóstico e Proposta Técnica

## 1. Diagnóstico do estado atual

### Onde está a página
- **Arquivo:** `compras-coletivas.html` (raiz do repositório)
- **Menu:** link "Compra Coletiva" no header de todas as páginas

### O que ela faz hoje
- Exibe um formulário com **itens fixos** no HTML (arroz, feijão, azeite, ovos, frutas, verduras, mandioca, farinha, mel, café/ervas).
- Cada item é uma linha com `label` + `input type="number"` com `name` e `id` hard-coded.
- **Envio:** `action="mailto:contato@florestavital.com?subject=..."` e `method="post"` — ou seja, ao clicar em "Entrar na lista", o navegador abre o cliente de e-mail com os dados no corpo (formato text/plain).
- Não há persistência estruturada: os pedidos não são salvos em planilha nem em base de dados.
- Não há gestão de estoque, visibilidade ou catálogo configurável.

### Principais limitações
1. **Mailto:** dependência do cliente de e-mail do usuário; dados não estruturados; sem confirmação automática na página.
2. **Itens fixos:** qualquer alteração (novo item, unidade, estoque) exige editar HTML e redeploy.
3. **Sem gestão:** impossível ativar/desativar itens, controlar estoque ou ver pedidos consolidados.
4. **Sem registro estruturado:** não há planilha/CSV/API para operação, estoque ou relatórios.

---

## 2. Proposta técnica (arquitetura)

### Visão geral do fluxo
- **Público:** usuário acessa `compras-coletivas.html` → a página carrega itens ativos via **GET** no backend → monta o formulário dinamicamente → ao enviar, valida no front e envia **POST** com dados do pedido → backend grava na planilha "Orders" e debita estoque na aba "Items" → front mostra mensagem de sucesso.
- **Admin:** usuário acessa `admin-compras-coletivas.html` (fora do menu) → informa **token de administrador** (guardado apenas no Google Apps Script) → front guarda token em `sessionStorage` e envia em todas as requisições admin → backend valida token e permite GET/POST de itens e GET de pedidos.

### Onde ficam dados
| Dado        | Onde fica | Formato |
|------------|-----------|---------|
| Catálogo (itens, estoque, ativo) | Google Sheets — aba **Items** | Linhas: id, nome, unidade, ativo, estoque, preco, ordem |
| Pedidos    | Google Sheets — aba **Orders** | Linhas: orderId, timestamp, nome, email, telefone, bairro, observacoes, itens (JSON) |
| Segredo admin | Google Apps Script — Script Properties | Chave `ADMIN_TOKEN` |

### Backend: Google Apps Script (Web App)
- **Por que funciona com GitHub Pages:** o site continua 100% estático; o "backend" é um Web App do Google (URL única) que recebe GET/POST. O frontend usa `fetch()` para essa URL. Não é necessário servidor próprio nem funções serverless adicionais.
- **CORS:** o Apps Script pode definir cabeçalhos de resposta para permitir origem do site (ex.: `https://luizhenriquefloresta.github.io`).
- **Custo:** gratuito dentro das cotas do Google (leitura/escrita em uma planilha e execuções diárias suficientes para MVP).

### Segurança mínima
- Endpoints **públicos:** apenas `GET items` (só itens ativos) e `POST order`.
- Endpoints **admin:** `GET/POST items` (lista completa e atualização), `GET orders` e `POST verify` exigem header `X-Admin-Token` (ou parâmetro token) igual ao valor em Script Properties. O token **não** fica no código do site; apenas o administrador sabe e digita uma vez na tela de login.

### Arquivos do repositório (resumo)
- `compras-coletivas.html` — atualizado: formulário dinâmico, envio por fetch.
- `js/config.js` — URL base do Web App (sem segredos).
- `js/compras-coletivas.js` — carregar itens, renderizar formulário, validar, enviar pedido.
- `admin-compras-coletivas.html` — tela de login por token + gestão de itens + (opcional) pedidos e exportar CSV.
- `js/admin-compras-coletivas.js` — login, CRUD itens, listar pedidos, exportar CSV.
- `google-apps-script/Code.gs` — código completo do Web App (deploy separado no Google).
- `docs/SETUP-DEPLOY.md` — passo a passo planilha, deploy do Script e configuração do front.

---

## 3. Próximos passos
- Implementação completa em código (front + Apps Script).
- Instruções de setup e deploy.
- Checklist de testes manuais para o MVP.
