# Resumo do pedido, Frete por região e Pagamento

## Visão geral

O fluxo da Compra Coletiva passou a ter **três etapas** após a escolha da cesta:

1. **Resumo do pedido** — Detalhes dos itens, subtotal, opção de **retirada** (sem frete) ou **entrega por região** (frete cadastrado), **custo administrativo** (% configurável), **contribuição voluntária** (% com sugestões) e **total**.
2. **Pagamento** — Exibe o total e as instruções para pagamento (estrutura pronta para integração PIX / Mercado Pago / Stripe).

---

## Planilha

### Aba **Regiao**

Criada automaticamente ao salvar regiões no admin (aba **Região e frete**).

- **Colunas:** `regiao` | `frete` (valor em R$).
- Uma linha por região de entrega (ex.: "Zona Norte" | 15).

### Aba **Config**

Criada automaticamente ao salvar a config no admin (mesma aba **Região e frete**).

- **Colunas:** `chave` | `valor`.
- Linhas usadas:
  - `custoAdministrativoPercentual` → número (ex.: 5).
  - `contribuicaoSugerida` → texto com % separados por vírgula (ex.: "0, 2, 5").

### Aba **Orders** (colunas novas)

A partir da coluna 10, o pedido passa a gravar:

- `regiao` — Nome da região (ou vazio se retirada).
- `valorFrete` — Valor do frete (0 se retirada).
- `custoAdmin` — Valor do custo administrativo.
- `contribuicao` — Valor da contribuição voluntária.
- `subtotalItens` — Soma dos itens.
- `total` — Total final do pedido.

---

## Admin

### Aba **Região e frete**

- **Tabela Regiões:** editar região e frete (R$); usar a linha vazia para nova região; **Salvar regiões** grava na aba **Regiao**.
- **Configuração do resumo:** 
  - **Custo administrativo (%)** — Percentual sobre o subtotal dos itens.
  - **Sugestões de contribuição voluntária (%)** — Ex.: "0, 2, 5" (separadas por vírgula).
- **Salvar config** grava na aba **Config**.

---

## Fluxo no site (Compra Coletiva)

1. Cliente preenche dados e itens da cesta → **Ver resumo do pedido**.
2. **Resumo:** vê itens e subtotal; escolhe **Retirada** (sem frete) ou **Entrega por região** (lista da aba Regiao); vê custo administrativo e escolhe contribuição (% sugeridos ou valor); vê o **total** → **Ir para pagamento**.
3. **Pagamento:** vê o total; texto explicando PIX (com desconto) e outras opções; **Confirmar pedido** envia o pedido com todos os valores (frete, custo admin, contribuição, total) para o backend.

---

## Integração com meio de pagamento

A tela de **Pagamento** já exibe o total e um bloco de texto. A integração real (PIX com QR, Mercado Pago, Stripe) pode ser feita depois:

- **PIX:** uso de API do Banco Central ou de um provedor (ex.: Mercado Pago, Stripe) para gerar cobrança PIX e, se desejar, aplicar desconto do percentual da instituição.
- **Mercado Pago / Stripe:** SDK no front e criação de preferência/payment no backend (Apps Script ou outro servidor); após confirmação do pagamento, atualizar status do pedido.

Enquanto isso, o pedido é registrado com o **total** e as instruções podem ser combinadas por e-mail/WhatsApp (transferência, PIX manual, etc.).
