# Deploy do site no GitHub Pages

**Se você não entende de tecnologia** e quer um passo a passo detalhado para deixar o site e a Compra Coletiva no ar, use o guia:  
**docs/GUIA-PASSO-A-PASSO-CONFIGURACAO.md**

---

## Configuração (uma vez)

O repositório inclui um **workflow de GitHub Actions** (`.github/workflows/deploy-pages.yml`) que publica o site a cada push na branch `main`. Para ativar:

1. Abra **Settings** do repositório no GitHub → **Pages** (menu esquerdo, em "Code and automation").
2. Em **Build and deployment** → **Source**, selecione **GitHub Actions**.
3. Pronto. Nos próximos pushes na branch `main`, o workflow será executado e o site será publicado.

**URL do site** (troque `USUARIO` e `REPO` pelo dono do repositório e nome do repo):
- Ex.: https://luizhenriquefloresta.github.io/florestavital/
- Ou: https://sraphaz.github.io/florestavital/ (se for o seu fork)

---

## Alternativa: publicar direto de uma branch (sem Actions)

Se preferir não usar o workflow:

1. Em **Settings** → **Pages** → **Source**, selecione **Deploy from a branch**.
2. **Branch:** `main` (ou `master`).
3. **Folder:** `/ (root)`.
4. **Save**.

---

## Compra Coletiva (backend + admin)

A Compra Coletiva usa Google Sheets + Google Apps Script como backend. Para configurar:

1. Siga o passo a passo em **docs/SETUP-DEPLOY-COMPRAS-COLETIVAS.md** (planilha, Apps Script, token, URL no `js/config.js`).
2. Use o **docs/CHECKLIST-TESTES-COMPRAS-COLETIVAS.md** para validar o MVP após o deploy.

### Deploy automático do Apps Script (opcional)

É possível enviar o código de `google-apps-script/` para o projeto no Google a cada push em `main`, usando **clasp** e GitHub Actions. Assim você não precisa copiar e colar o `Code.gs` manualmente. Configuração em: **docs/DEPLOY-APPS-SCRIPT.md**.
