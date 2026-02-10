# Verificação do pedido: WhatsApp vs e-mail

## O que está implementado hoje: **verificação por e-mail (grátis)**

O sistema envia um **código de 6 dígitos por e-mail** antes de liberar o formulário de pedido. Quem não informar o código correto não consegue finalizar o pedido. Isso garante que a pessoa tem acesso ao e-mail informado e dá mais autenticidade ao pedido.

- **Custo:** zero. O e-mail é enviado pela conta Google ligada à planilha (Apps Script usa `GmailApp`).
- **Requisito:** o usuário precisa informar um e-mail no perfil (ou na tela de verificação) e ter acesso à caixa de entrada para ver o código.

**Primeira vez que for enviar código:** a conta Google que é dona da planilha precisa ter autorizado o Apps Script a enviar e-mail. Ao usar “Enviar código” pela primeira vez, se der erro de permissão, abra o Apps Script (Extensões → Apps Script), crie uma função de teste que chame `GmailApp.sendEmail('seu@email.com', 'Teste', 'Teste')`, execute essa função uma vez no editor e aceite a autorização de “Enviar e-mail em seu nome”. Depois disso, o envio do código pelo site funcionará.

---

## Por que não há verificação por WhatsApp (gratuita)?

Na **API oficial do WhatsApp (WhatsApp Business Platform / Meta)**:

- Mensagens de **autenticação** (código de verificação, OTP) são uma categoria **paga**.
- Não existe “tier gratuito” para envio de códigos de verificação por WhatsApp; cada mensagem desse tipo é cobrada conforme a tabela da Meta (por país e tipo de mensagem).
- Serviços que “enviam WhatsApp grátis” costumam usar métodos não oficiais (ex.: automação do WhatsApp Web), que violam os termos de uso e podem levar a bloqueio da conta.

Por isso, a solução **gratuita** escolhida foi a verificação por **e-mail**.

---

## Se no futuro quiser usar WhatsApp (pago)

É possível trocar ou complementar o envio do código usando a **WhatsApp Business API** (Meta) ou um provedor (ex.: Twilio):

1. Conta no [Meta for Developers](https://developers.facebook.com/) e configuração do app WhatsApp.
2. Número de telefone business aprovado para envio.
3. Uso de **templates de mensagem** aprovados (ex.: “Seu código é: {{1}}”).
4. Custo por mensagem de autenticação entregue (valor varia por país).

O fluxo atual (gerar código, guardar em cache, validar quando o usuário digita) continua o mesmo; só seria preciso trocar o **envio** do código: em vez de `GmailApp.sendEmail`, chamar a API do WhatsApp para enviar o mesmo código por mensagem. O backend (Apps Script) pode chamar um serviço externo via `UrlFetchApp` se você tiver uma API key ou um pequeno serviço que repasse para a API do WhatsApp.

---

## Resumo

| Canal        | Custo              | Implementado no projeto |
|-------------|--------------------|--------------------------|
| **E-mail**  | Grátis (Gmail)     | Sim — código por e-mail |
| **WhatsApp**| Pago (Meta/API)    | Não — exige API paga    |

A verificação por e-mail já garante autenticidade do pedido de forma gratuita. Verificação por WhatsApp só é viável com API paga.
