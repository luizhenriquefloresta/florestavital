# Configuração por ambiente

Ao usar este projeto no **seu** ambiente (seu fork, sua planilha, seu deploy), estas configurações precisam ser feitas por você. Nada disso funciona “igual ao do outro”: cada um usa sua própria URL e sua própria planilha.

| O quê | Onde | O que fazer |
|-------|------|-------------|
| **URL do backend** | `js/config.js` → `COMPRAS_COLETIVAS_API` | Copie `js/config.js.example` para `js/config.js` e substitua o placeholder pela **sua** URL do Web App (Apps Script) ou pela **sua** URL do proxy CORS. Sem isso o site não conecta. |
| **Planilha no Apps Script** | Apps Script → Executar → Propriedades do projeto | Se o script rodar sem planilha aberta (ex.: Web App), adicione a variável **SPREADSHEET_ID** com o ID da **sua** planilha (o ID está na URL: `docs.google.com/spreadsheets/d/ESTE_ID/edit`). |
| **Script ID / deploy** | `.clasp.json` (não vai no Git) | Copie de `.clasp.json.example` para `.clasp.json` e coloque o **seu** Script ID. Use o **seu** projeto do Apps Script vinculado à **sua** planilha. |

Resumo: **config.js** = sua URL; **SPREADSHEET_ID** = sua planilha; **.clasp.json** = seu Script ID. Com isso, tudo funciona no ambiente de cada um.
