# Checklist de testes manuais — Compra Coletiva (MVP)

Use este checklist após configurar a planilha, o Apps Script e o `js/config.js`.

---

## Página pública (compras-coletivas.html)

- [ ] **Carregamento**
  - Ao abrir a página, os itens são carregados dinamicamente (não aparecem itens fixos do HTML).
  - Se a API estiver inacessível ou a planilha vazia, aparece mensagem amigável (ex.: "Nenhum item disponível" ou "Não foi possível carregar os itens").

- [ ] **Validação — campos obrigatórios**
  - Enviar com nome vazio → mensagem de erro (ex.: "Preencha o nome").
  - Enviar com e-mail vazio → mensagem de erro.
  - Enviar com telefone vazio → mensagem de erro.

- [ ] **Validação — itens**
  - Enviar com todos os itens em 0 → mensagem do tipo "Selecione pelo menos um item com quantidade maior que zero".

- [ ] **Validação — estoque**
  - Colocar quantidade maior que o estoque disponível de um item e enviar → mensagem de erro sobre estoque insuficiente.

- [ ] **Envio com sucesso**
  - Preencher nome, e-mail, telefone, pelo menos um item com quantidade > 0.
  - Enviar → mensagem de sucesso com número do pedido; formulário é limpo (ou quantidades zeradas).
  - Na planilha **Orders**, aparece uma nova linha com orderId, timestamp, nome, email, telefone, bairro, observações, itens (JSON).

- [ ] **Debitar estoque**
  - Anotar o estoque atual de um item na aba **Items**.
  - Fazer um pedido com quantidade 2 desse item.
  - Verificar na aba **Items** se o estoque desse item diminuiu 2.

---

## Área administrativa (admin-compras-coletivas.html)

- [ ] **Login**
  - Acessar admin-compras-coletivas.html → aparece tela pedindo token.
  - Token errado → mensagem "Token inválido".
  - Token correto (o mesmo configurado em `ADMIN_TOKEN` no Apps Script) → entra no painel (gestão de itens e pedidos).

- [ ] **Gestão de itens**
  - Após login, a tabela de itens é preenchida com os dados da aba **Items**.
  - Desmarcar "Ativo" de um item e clicar em "Salvar alterações" → na planilha o item fica FALSE; na página pública esse item deixa de aparecer.
  - Alterar estoque de um item e salvar → na planilha o valor é atualizado.
  - (Opcional) Alterar nome, unidade, preço ou ordem e salvar → planilha atualizada.

- [ ] **Pedidos recentes**
  - A tabela "Pedidos recentes" mostra os últimos 20 pedidos (orderId, data, nome, e-mail, telefone, bairro, itens).

- [ ] **Exportar CSV**
  - Clicar em "Exportar CSV" → é baixado um arquivo CSV com os pedidos exibidos (encoding UTF-8 com BOM).

- [ ] **Sair**
  - Clicar em "Sair" → volta à tela de login; ao reabrir a página, é necessário digitar o token de novo (token só em sessionStorage).

---

## Segurança e integração

- [ ] **Admin sem token no código**
  - Em `js/config.js` e no HTML/JS do site não há token nem senha; o token é digitado apenas na tela de login do admin.

- [ ] **Layout e navegação**
  - compras-coletivas.html mantém o mesmo header, footer e estilo do restante do site (css/styles.css).
  - admin-compras-coletivas.html não aparece no menu público; acesso apenas pela URL direta.

---

## Resumo

- Página pública: itens dinâmicos, validações (obrigatórios, pelo menos um item, estoque), envio para planilha, mensagem de sucesso e débito de estoque.
- Admin: login por token, edição de itens (ativo, estoque, etc.), listagem de pedidos e exportação CSV.
- Dados persistentes na planilha; sem segredos no frontend.
