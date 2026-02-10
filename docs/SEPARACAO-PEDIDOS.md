# Separação de pedidos — abas em linhas

Para facilitar a separação dos pedidos, o script gera duas abas que “explodem” o campo **itens** (JSON) em **uma linha por item**, com dados do pedido e do produto.

## Abas geradas

1. **Separação** — visão geral: todas as linhas de todos os pedidos ativos, em uma única tabela.  
   Ideal para filtrar por item, somar quantidades totais por produto, etc.

2. **Separação por pedido** — mesmas colunas, mas com uma **linha em branco entre pedidos**, para ler pedido a pedido na hora de separar.

## Colunas (em ambas as abas)

| Coluna       | Conteúdo                          |
|-------------|------------------------------------|
| orderId     | ID do pedido (ex.: FV-1234567890) |
| nome        | Nome do cliente                   |
| telefone    | Telefone do cliente               |
| email       | E-mail do cliente                 |
| bairro      | Bairro/região de retirada         |
| observacoes | Observações do pedido             |
| item_id     | ID do item (ex.: arroz, feijao)   |
| item_nome   | Nome do item (vindo da aba Items) |
| unidade     | Unidade (kg, un, dúzia…)          |
| quantidade  | Quantidade pedida                  |
| valor_unit  | Preço unitário (aba Items)        |
| total       | quantidade × valor_unit           |

Pedidos com **status = cancelado** não entram na separação.

## Como atualizar as abas

As abas **não** são atualizadas sozinhas. É preciso rodar a função que regera as duas abas:

1. **Pelo menu (recomendado)**  
   - Abra a planilha no Google Sheets.  
   - No menu, deve aparecer **Compra Coletiva** → **Atualizar Separação (pedidos em linhas)**.  
   - Clique uma vez. As abas **Separação** e **Separação por pedido** são criadas ou atualizadas.

2. **Pelo Apps Script**  
   - Extensões → Apps Script.  
   - Selecione a função **runAtualizarSeparacao** no dropdown e clique em **Executar**.  
   - Na primeira vez, autorize o acesso à planilha se o Google pedir.

Se o menu **Compra Coletiva** não aparecer, recarregue a planilha (F5) ou execute uma vez a função **onOpen** no editor do Apps Script (ela registra o menu).

## Observações

- **valor_unit** e **total** vêm do preço cadastrado na aba **Items**. Se o preço estiver 0, o total da linha será 0.
- As abas são recriadas a cada atualização: qualquer formatação ou fórmula que você colocar nelas será apagada na próxima execução de **Atualizar Separação**.
