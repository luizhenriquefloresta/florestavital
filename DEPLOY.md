# Deploy do site no GitHub Pages

**Se você não entende de tecnologia** e quer um passo a passo detalhado para deixar o site e a Compra Coletiva no ar, use o guia:  
**docs/GUIA-PASSO-A-PASSO-CONFIGURACAO.md**

---

## Configuração (uma vez)

1. Abra: https://github.com/luizhenriquefloresta/florestavital/settings/pages
2. Em **Build and deployment** → **Source**, selecione **Deploy from a branch**
3. Em **Branch**: escolha **main**
4. Em **Folder**: escolha **/ (root)**
5. Clique em **Save**

Pronto! O site será publicado automaticamente a cada push na branch `main`.

**URL do site:** https://luizhenriquefloresta.github.io/florestavital/

---

## Compra Coletiva (backend + admin)

A Compra Coletiva usa Google Sheets + Google Apps Script como backend. Para configurar:

1. Siga o passo a passo em **docs/SETUP-DEPLOY-COMPRAS-COLETIVAS.md** (planilha, Apps Script, token, URL no `js/config.js`).
2. Use o **docs/CHECKLIST-TESTES-COMPRAS-COLETIVAS.md** para validar o MVP após o deploy.
