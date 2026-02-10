# Separação de pedidos — abas em linhas

Para facilitar a separação dos pedidos, o script gera **quatro abas** que “explodem” o campo **itens** (JSON) em **uma linha por item**, conforme o **status** do pedido (ativo, separado, entregue). Apenas pedidos **ativos** ficam nas abas de separação em andamento; ao marcar como **separado** ou **entregue** (na tela admin), o pedido sai dessas abas e passa para as abas de histórico.

## Status do pedido

Na aba **Orders** (coluna status) e na **tela admin** (botões por pedido):

- **ativo** — pedido novo ou em aberto; aparece em **Separacao** e **Separacao por pedido**.
- **separado** — admin marcou como “Separado”; o pedido sai da separação em andamento e entra na aba **Pedidos separados**.
- **entregue** — admin marcou como “Entregue”; o pedido entra na aba **Pedidos entregues**.
- **cancelado** — cliente ou admin cancelou; não entra em nenhuma aba de separação.

O cliente vê o status ao consultar “Meus pedidos” (Ativo, Separado, Entregue, Cancelado).

## Abas geradas

1. **Separacao** — **uma linha por item**: quantidades **somadas** só dos pedidos **ativos**.  
   Ex.: se 10 pedidos ativos pedem “arroz”, aparece **uma linha** com arroz e a quantidade total. Serve para a operação separar tudo de uma vez (lista de compras consolidada).

2. **Separacao por pedido** — **agrupado por pedido**: cada pedido **ativo** com seus itens e dados do cliente; linha em branco entre pedidos. Serve para montar cada pedido.

3. **Pedidos separados** — mesmas colunas que “Separacao por pedido”, só com pedidos já marcados como **separado**.

4. **Pedidos entregues** — mesmas colunas que “Separacao por pedido”, só com pedidos já marcados como **entregue**.

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

Pedidos **cancelados** não entram em nenhuma aba. Só pedidos **ativos** entram em Separacao e Separacao por pedido; **separado** e **entregue** têm abas próprias.

**Atualização automática:** ao criar, cancelar ou editar um pedido (pelo site ou pela API), ou ao mudar o status para **separado** ou **entregue** na tela admin, o script atualiza as **quatro abas** sozinho. Para isso funcionar quando o pedido vem do site (Web App), configure **SPREADSHEET_ID** nas Propriedades do projeto do Apps Script. Se não estiver configurado, as abas só mudam quando alguém rodar **Atualizar Separação** pelo menu da planilha.

## Como atualizar as abas

As abas **não** são atualizadas sozinhas. É preciso rodar a função que regera as duas abas:

1. **Pelo menu (recomendado)**  
   - Abra a planilha no Google Sheets.  
   - No menu, deve aparecer **Compra Coletiva** → **Atualizar Separação (pedidos em linhas)**.  
   - Clique uma vez. As abas **Separacao**, **Separacao por pedido**, **Pedidos separados** e **Pedidos entregues** são criadas ou atualizadas.  
   - Se der “erro desconhecido” ao rodar pelo editor do Apps Script, rode **pela planilha** (menu acima); ou adicione **SPREADSHEET_ID** nas Propriedades do projeto.

2. **Pelo Apps Script**  
   - Extensões → Apps Script.  
   - Selecione a função **runAtualizarSeparacao** no dropdown e clique em **Executar** (não use **buildDadosSeparacao** — essa é função interna).  
   - Se rodar pelo editor **sem** abrir a planilha, configure **SPREADSHEET_ID** em Executar → Propriedades do projeto (ID da planilha está na URL: `docs.google.com/spreadsheets/d/ESTE_ID/edit`).  
   - Na primeira vez, autorize o acesso à planilha se o Google pedir.

Se o menu **Compra Coletiva** não aparecer, recarregue a planilha (F5) ou execute uma vez a função **onOpen** no editor do Apps Script (ela registra o menu).

**Teste de conexão:** no editor do Apps Script, execute a função **runTestarConexao**. Se retornar "OK: planilha encontrada", o script está achando a planilha; se der erro, a mensagem indica o que falta (por exemplo, configurar SPREADSHEET_ID).

**Coluna Status na aba Orders:** a aba Orders precisa da coluna 9 **status** (ativo, separado, entregue, cancelado). Se a planilha foi criada antes dessa funcionalidade, abra a planilha → menu **Compra Coletiva** → **Garantir coluna Status na aba Orders** (ou execute **runGarantirColunaStatus** no editor). Isso cria a coluna e preenche "ativo" nas linhas vazias.

**Se aparecer "Unknown action" ao clicar em Separado/Entregue no admin:** (1) Copie o **Code.gs** mais recente do repositório para o Apps Script e faça **Implantar → Nova versão**. (2) Execute **runGarantirColunaStatus** na planilha. (3) Em **Execuções** do Apps Script, abra a última execução e veja o **Log**: deve aparecer `[doGet] action="updateOrderStatus"`. Se aparecer `action=""`, a URL do proxy ou a implantação não está passando os parâmetros.

**Logs para diagnosticar:** o script grava logs com o prefixo `[Separacao]`. Depois de rodar **runAtualizarSeparacao** (ou de fazer um pedido pelo site), abra no Apps Script: **Execuções** (ícone de relógio) → clique na execução desejada → **Log**. Você verá em que etapa parou (getSpreadsheet, buildDadosSeparacao, criarOuLimparSeparacao) e quantas linhas foram lidas/escritas.

## Observações

- **valor_unit** e **total** vêm do preço cadastrado na aba **Items**. Se o preço estiver 0, o total da linha será 0.
- As abas são recriadas a cada atualização: qualquer formatação ou fórmula que você colocar nelas será apagada na próxima execução de **Atualizar Separação**.
