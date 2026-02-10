# Separação de pedidos — abas em linhas

Para facilitar a separação dos pedidos, o script gera duas abas que “explodem” o campo **itens** (JSON) em **uma linha por item**, com dados do pedido e do produto.

## Abas geradas

1. **Separacao** — **uma linha por item**: quantidades **somadas** de todos os pedidos ativos.  
   Ex.: se 10 pedidos pedem “arroz”, aparece **uma linha** com arroz e a quantidade total. Serve para a operação separar tudo de uma vez (lista de compras consolidada).

2. **Separacao por pedido** — **agrupado por pedido**: cada pedido com seus itens e dados do cliente; linha em branco entre pedidos. Serve para montar/entregar cada pedido.

(Nomes sem acento para evitar erro em alguns ambientes.)

## Colunas

**Aba Separacao (por item)**  
| Coluna            | Conteúdo                                |
|-------------------|-----------------------------------------|
| item_id           | ID do item (ex.: arroz, feijao)        |
| item_nome         | Nome do item                            |
| unidade           | Unidade (kg, un, dúzia…)                |
| quantidade_total | Soma das quantidades em todos os pedidos |
| valor_unit        | Preço unitário (aba Items)              |
| total             | quantidade_total × valor_unit           |

**Aba Separacao por pedido**  
| Coluna       | Conteúdo                          |
|-------------|------------------------------------|
| orderId     | ID do pedido                       |
| nome        | Nome do cliente                    |
| telefone    | Telefone                           |
| email       | E-mail                             |
| bairro      | Bairro/região de retirada          |
| observacoes | Observações                        |
| item_id     | ID do item                         |
| item_nome   | Nome do item                       |
| unidade     | Unidade                            |
| quantidade  | Quantidade naquele pedido          |
| valor_unit  | Preço unitário                     |
| total       | quantidade × valor_unit            |

Pedidos com **status = cancelado** não entram.

**Atualização automática:** ao criar, cancelar ou editar um pedido (pelo site ou pela API), o script atualiza as abas **Separacao** e **Separacao por pedido** sozinho. Para isso funcionar quando o pedido vem do site (Web App), configure **SPREADSHEET_ID** nas Propriedades do projeto do Apps Script. Se não estiver configurado, as abas só mudam quando alguém rodar **Atualizar Separação** pelo menu da planilha.

## Como atualizar as abas

As abas **não** são atualizadas sozinhas. É preciso rodar a função que regera as duas abas:

1. **Pelo menu (recomendado)**  
   - Abra a planilha no Google Sheets.  
   - No menu, deve aparecer **Compra Coletiva** → **Atualizar Separação (pedidos em linhas)**.  
   - Clique uma vez. As abas **Separacao** e **Separacao por pedido** são criadas ou atualizadas.  
   - Se der “erro desconhecido” ao rodar pelo editor do Apps Script, rode **pela planilha** (menu acima); ou adicione **SPREADSHEET_ID** nas Propriedades do projeto.

2. **Pelo Apps Script**  
   - Extensões → Apps Script.  
   - Selecione a função **runAtualizarSeparacao** no dropdown e clique em **Executar** (não use **buildDadosSeparacao** — essa é função interna).  
   - Se rodar pelo editor **sem** abrir a planilha, configure **SPREADSHEET_ID** em Executar → Propriedades do projeto (ID da planilha está na URL: `docs.google.com/spreadsheets/d/ESTE_ID/edit`).  
   - Na primeira vez, autorize o acesso à planilha se o Google pedir.

Se o menu **Compra Coletiva** não aparecer, recarregue a planilha (F5) ou execute uma vez a função **onOpen** no editor do Apps Script (ela registra o menu).

**Teste de conexão:** no editor do Apps Script, execute a função **runTestarConexao**. Se retornar "OK: planilha encontrada", o script está achando a planilha; se der erro, a mensagem indica o que falta (por exemplo, configurar SPREADSHEET_ID).

**Logs para diagnosticar:** o script grava logs com o prefixo `[Separacao]`. Depois de rodar **runAtualizarSeparacao** (ou de fazer um pedido pelo site), abra no Apps Script: **Execuções** (ícone de relógio) → clique na execução desejada → **Log**. Você verá em que etapa parou (getSpreadsheet, buildDadosSeparacao, criarOuLimparSeparacao) e quantas linhas foram lidas/escritas.

## Observações

- **valor_unit** e **total** vêm do preço cadastrado na aba **Items**. Se o preço estiver 0, o total da linha será 0.
- As abas são recriadas a cada atualização: qualquer formatação ou fórmula que você colocar nelas será apagada na próxima execução de **Atualizar Separação**.
