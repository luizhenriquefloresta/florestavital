/**
 * Floresta Vital - Compra Coletiva
 * Web App backend: catálogo (Items) e pedidos (Orders) em Google Sheets.
 * Configure ADMIN_TOKEN em Script Properties (Executar > Propriedades do projeto).
 */

var SHEET_ITEMS = 'Items';
var SHEET_ORDERS = 'Orders';
var SHEET_USERS = 'Users';
var PROP_ADMIN_TOKEN = 'ADMIN_TOKEN';

/**
 * Resposta JSON. O Web App do Google Apps Script não permite setHeaders no TextOutput;
 * ao publicar como "Qualquer pessoa", o Google costuma permitir requisições de outros
 * domínios (fetch do site no GitHub Pages).
 */
function jsonResponse(data, statusCode) {
  statusCode = statusCode || 200;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var action = params.action || '';

  if (action === 'items') {
    return getItemsPublic();
  }
  if (action === 'user') {
    var telefone = (params.telefone || '').toString().trim();
    return getUserByPhone(telefone);
  }
  if (action === 'adminItems' || action === 'orders') {
    var token = params.token || (e && e.parameter && e.parameter.token);
    if (!isAdminTokenValid(token)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }
    if (action === 'adminItems') return getItemsAdmin();
    if (action === 'orders') return getOrdersAdmin(params.limit || '20');
  }
  if (action === 'verify') {
    var t = params.token || '';
    if (isAdminTokenValid(t)) {
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ ok: false, error: 'Invalid token' }, 401);
  }

  return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
}

function doPost(e) {
  var blob = e && e.postData && e.postData.contents ? e.postData.contents : null;
  var token = (e && e.parameter && e.parameter.token) || null;

  if (!blob) {
    return jsonResponse({ ok: false, error: 'No body' }, 400);
  }

  var data;
  try {
    data = JSON.parse(blob);
  } catch (err) {
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  if (!token && data && data.token) token = data.token;

  if (data.action === 'register') {
    return postRegister(data);
  }
  if (data.action === 'sendCode') {
    return postSendCode(data);
  }
  if (data.action === 'verifyCode') {
    return postVerifyCode(data);
  }
  if (data.action === 'order') {
    return postOrder(data);
  }
  if (data.action === 'adminItems') {
    if (!isAdminTokenValid(token)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }
    return postItemsAdmin(data.items);
  }

  return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
}

function isAdminTokenValid(token) {
  if (!token || token.toString().trim() === '') return false;
  var stored = PropertiesService.getScriptProperties().getProperty(PROP_ADMIN_TOKEN);
  return stored && stored.toString().trim() === token.toString().trim();
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) return null;
  return sheet;
}

/** Normaliza telefone: só dígitos. */
function normalizePhone(t) {
  return (t || '').toString().replace(/\D/g, '');
}

/**
 * GET ?action=user&telefone=XXX
 * Retorna { ok, exists, user?: { telefone, nome, endereco, documento } }
 */
function getUserByPhone(telefoneParam) {
  var telefone = normalizePhone(telefoneParam);
  if (telefone.length < 10) {
    return jsonResponse({ ok: true, exists: false });
  }
  var sheet = getSheet(SHEET_USERS);
  if (!sheet) return jsonResponse({ ok: true, exists: false });
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true, exists: false });

  var numCols = 5;
  var data = sheet.getRange(2, 1, lastRow, numCols).getValues();
  for (var i = 0; i < data.length; i++) {
    if (normalizePhone(data[i][0]) === telefone) {
      return jsonResponse({
        ok: true,
        exists: true,
        user: {
          telefone: String(data[i][0] || '').trim(),
          nome: String(data[i][1] || '').trim(),
          endereco: String(data[i][2] || '').trim(),
          documento: String(data[i][3] || '').trim(),
          email: String(data[i][4] || '').trim()
        }
      });
    }
  }
  return jsonResponse({ ok: true, exists: false });
}

/**
 * POST { action: 'register', telefone, nome, endereco?, documento? }
 * Cria ou atualiza usuário na aba Users. Apenas usuário público (sem token admin).
 */
function postRegister(data) {
  if (data.action !== 'register') {
    return jsonResponse({ ok: false, error: 'action must be register' }, 400);
  }
  var telefone = normalizePhone((data.telefone || '').toString());
  var nome = (data.nome || '').toString().trim();
  if (telefone.length < 10) {
    return jsonResponse({ ok: false, error: 'Telefone inválido' }, 400);
  }
  if (!nome) {
    return jsonResponse({ ok: false, error: 'Nome é obrigatório' }, 400);
  }
  var endereco = (data.endereco || '').toString().trim();
  var documento = (data.documento || '').toString().trim();
  var email = (data.email || '').toString().trim();

  var sheet = getSheet(SHEET_USERS);
  if (!sheet) {
    return jsonResponse({ ok: false, error: 'Aba Users não encontrada. Crie a aba Users na planilha com colunas: telefone, nome, endereco, documento, email' }, 500);
  }
  var lastRow = sheet.getLastRow();
  var dataRows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow, 1).getValues() : [];
  for (var i = 0; i < dataRows.length; i++) {
    if (normalizePhone(dataRows[i][0]) === telefone) {
      sheet.getRange(i + 2, 2).setValue(nome);
      sheet.getRange(i + 2, 3).setValue(endereco);
      sheet.getRange(i + 2, 4).setValue(documento);
      sheet.getRange(i + 2, 5).setValue(email);
      return jsonResponse({ ok: true, user: { telefone: telefone, nome: nome, endereco: endereco, documento: documento, email: email } });
    }
  }
  sheet.appendRow([telefone, nome, endereco, documento, email]);
  return jsonResponse({ ok: true, user: { telefone: telefone, nome: nome, endereco: endereco, documento: documento, email: email } });
}

/** Código de verificação: 10 minutos. */
var CODE_TTL_SECONDS = 600;

/**
 * POST { action: 'sendCode', telefone, email? }
 * Envia código de 6 dígitos por e-mail (Gmail da conta do script). Gratuito.
 * Se email não vier no body, usa o e-mail cadastrado no perfil (Users).
 */
function postSendCode(data) {
  if (data.action !== 'sendCode') return jsonResponse({ ok: false, error: 'action must be sendCode' }, 400);
  var telefone = normalizePhone((data.telefone || '').toString());
  if (telefone.length < 10) return jsonResponse({ ok: false, error: 'Telefone inválido' }, 400);
  var email = (data.email || '').toString().trim();
  if (!email) {
    var sheet = getSheet(SHEET_USERS);
    if (sheet && sheet.getLastRow() >= 2) {
      var rows = sheet.getRange(2, 1, sheet.getLastRow(), 5).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (normalizePhone(rows[i][0]) === telefone) {
          email = String(rows[i][4] || '').trim();
          break;
        }
      }
    }
  }
  if (!email || email.indexOf('@') === -1) {
    return jsonResponse({ ok: false, error: 'Informe um e-mail válido no perfil ou neste passo para receber o código.' }, 400);
  }
  var code = Math.floor(100000 + Math.random() * 900000).toString();
  var cache = CacheService.getScriptCache();
  cache.put('cc_' + telefone, code, CODE_TTL_SECONDS);
  try {
    GmailApp.sendEmail(
      email,
      'Seu código — Compra Coletiva Floresta Vital',
      'Olá!\n\nSeu código de verificação é: ' + code + '\n\nEle vale por 10 minutos.\n\nSe não foi você que pediu, ignore este e-mail.\n\n— Floresta Vital',
      { name: 'Compra Coletiva Floresta Vital' }
    );
  } catch (e) {
    return jsonResponse({ ok: false, error: 'Não foi possível enviar o e-mail. Verifique se o Apps Script está autorizado a enviar e-mails (conta Google da planilha).' }, 500);
  }
  return jsonResponse({ ok: true });
}

/**
 * POST { action: 'verifyCode', telefone, code }
 * Confere o código e invalida após uso.
 */
function postVerifyCode(data) {
  if (data.action !== 'verifyCode') return jsonResponse({ ok: false, error: 'action must be verifyCode' }, 400);
  var telefone = normalizePhone((data.telefone || '').toString());
  var code = (data.code || '').toString().trim();
  if (!telefone || !code) return jsonResponse({ ok: false, error: 'Telefone e código são obrigatórios' }, 400);
  var cache = CacheService.getScriptCache();
  var stored = cache.get('cc_' + telefone);
  if (!stored || stored !== code) {
    return jsonResponse({ ok: false, error: 'Código inválido ou expirado. Peça um novo código.' }, 400);
  }
  cache.remove('cc_' + telefone);
  return jsonResponse({ ok: true });
}

/**
 * Retorna apenas itens ativos para a página pública (ordenados por ordem, depois nome).
 */
function getItemsPublic() {
  var sheet = getSheet(SHEET_ITEMS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Sheet Items not found' }, 500);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true, items: [] });

  var data = sheet.getRange(2, 1, lastRow, 7).getValues();
  var cols = ['id', 'nome', 'unidade', 'ativo', 'estoque', 'preco', 'ordem'];
  var items = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var ativo = row[3];
    if (ativo === true || ativo === 'TRUE' || ativo === 'true' || ativo === '1' || ativo === 1) {
      items.push({
        id: String(row[0] || '').trim(),
        nome: String(row[1] || '').trim(),
        unidade: String(row[2] || '').trim(),
        ativo: true,
        estoque: parseInt(row[4], 10) || 0,
        preco: parseFloat(row[5]) || 0,
        ordem: parseInt(row[6], 10) || 0
      });
    }
  }
  items.sort(function (a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return (a.nome || '').localeCompare(b.nome || '');
  });
  return jsonResponse({ ok: true, items: items });
}

/**
 * Retorna todos os itens para o admin.
 */
function getItemsAdmin() {
  var sheet = getSheet(SHEET_ITEMS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Sheet Items not found' }, 500);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true, items: [] });

  var data = sheet.getRange(2, 1, lastRow, 7).getValues();
  var items = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var ativo = row[3];
    items.push({
      id: String(row[0] || '').trim(),
      nome: String(row[1] || '').trim(),
      unidade: String(row[2] || '').trim(),
      ativo: ativo === true || ativo === 'TRUE' || ativo === 'true' || ativo === '1' || ativo === 1,
      estoque: parseInt(row[4], 10) || 0,
      preco: parseFloat(row[5]) || 0,
      ordem: parseInt(row[6], 10) || 0
    });
  }
  items.sort(function (a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return (a.nome || '').localeCompare(b.nome || '');
  });
  return jsonResponse({ ok: true, items: items });
}

/**
 * Atualiza itens na planilha (estoque, ativo, e opcionalmente nome/unidade/preco/ordem).
 * items: array de { id, nome?, unidade?, ativo?, estoque?, preco?, ordem? }
 */
function postItemsAdmin(items) {
  if (!items || !Array.isArray(items)) {
    return jsonResponse({ ok: false, error: 'items array required' }, 400);
  }
  var sheet = getSheet(SHEET_ITEMS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Sheet Items not found' }, 500);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true });

  var data = sheet.getRange(2, 1, lastRow, 7).getValues();
  var idToRowIndex = {};
  for (var i = 0; i < data.length; i++) {
    idToRowIndex[String(data[i][0] || '').trim()] = i + 2;
  }

  for (var j = 0; j < items.length; j++) {
    var it = items[j];
    var id = String(it.id || '').trim();
    if (!id) continue;
    var rowNum = idToRowIndex[id];
    if (!rowNum) continue;

    if (it.hasOwnProperty('nome')) sheet.getRange(rowNum, 2).setValue(it.nome);
    if (it.hasOwnProperty('unidade')) sheet.getRange(rowNum, 3).setValue(it.unidade);
    if (it.hasOwnProperty('ativo')) sheet.getRange(rowNum, 4).setValue(it.ativo ? 'TRUE' : 'FALSE');
    if (it.hasOwnProperty('estoque')) sheet.getRange(rowNum, 5).setValue(Number(it.estoque) || 0);
    if (it.hasOwnProperty('preco')) sheet.getRange(rowNum, 6).setValue(Number(it.preco) || 0);
    if (it.hasOwnProperty('ordem')) sheet.getRange(rowNum, 7).setValue(Number(it.ordem) || 0);
  }

  return jsonResponse({ ok: true });
}

/**
 * Lista últimos pedidos para o admin.
 */
function getOrdersAdmin(limitStr) {
  var limit = parseInt(limitStr, 10) || 20;
  var sheet = getSheet(SHEET_ORDERS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Sheet Orders not found' }, 500);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true, orders: [] });

  var startRow = Math.max(2, lastRow - limit + 1);
  var data = sheet.getRange(startRow, 1, lastRow, 8).getValues();
  var orders = [];
  for (var i = data.length - 1; i >= 0; i--) {
    var row = data[i];
    orders.push({
      orderId: String(row[0] || ''),
      timestamp: String(row[1] || ''),
      nome: String(row[2] || ''),
      email: String(row[3] || ''),
      telefone: String(row[4] || ''),
      bairro: String(row[5] || ''),
      observacoes: String(row[6] || ''),
      itens: String(row[7] || '{}')
    });
  }
  return jsonResponse({ ok: true, orders: orders });
}

/**
 * Registra um novo pedido e debita estoque.
 * Body: { action: 'order', nome, telefone, bairro?, observacoes?, email? (opcional), itens }
 * Usuário deve estar identificado por telefone (login por celular).
 */
function postOrder(data) {
  if (data.action !== 'order') {
    return jsonResponse({ ok: false, error: 'action must be order' }, 400);
  }
  var nome = (data.nome || '').toString().trim();
  var telefone = normalizePhone((data.telefone || '').toString());
  var email = (data.email || '').toString().trim();
  if (!nome || !telefone) {
    return jsonResponse({ ok: false, error: 'Nome e telefone são obrigatórios' }, 400);
  }
  if (telefone.length < 10) {
    return jsonResponse({ ok: false, error: 'Telefone inválido' }, 400);
  }
  var itens = data.itens;
  if (!itens || typeof itens !== 'object') {
    return jsonResponse({ ok: false, error: 'itens obrigatório' }, 400);
  }

  var sheetItems = getSheet(SHEET_ITEMS);
  var sheetOrders = getSheet(SHEET_ORDERS);
  if (!sheetItems || !sheetOrders) {
    return jsonResponse({ ok: false, error: 'Planilha não configurada' }, 500);
  }

  var lastRowItems = sheetItems.getLastRow();
  if (lastRowItems < 2) return jsonResponse({ ok: false, error: 'Nenhum item cadastrado' }, 400);

  var itemsData = sheetItems.getRange(2, 1, lastRowItems, 5).getValues();
  var idToRow = {};
  var idToEstoque = {};
  for (var i = 0; i < itemsData.length; i++) {
    var id = String(itemsData[i][0] || '').trim();
    idToRow[id] = i + 2;
    idToEstoque[id] = parseInt(itemsData[i][4], 10) || 0;
  }

  for (var id in itens) {
    if (!itens.hasOwnProperty(id)) continue;
    var qty = parseInt(itens[id], 10) || 0;
    if (qty <= 0) continue;
    if (!idToRow[id]) {
      return jsonResponse({ ok: false, error: 'Item inválido: ' + id }, 400);
    }
    if (idToEstoque[id] < qty) {
      return jsonResponse({ ok: false, error: 'Estoque insuficiente para o item: ' + id }, 400);
    }
  }

  var orderId = 'FV-' + new Date().getTime();
  var timestamp = new Date().toISOString();
  var bairro = (data.bairro || '').toString().trim();
  var observacoes = (data.observacoes || '').toString().trim();

  sheetOrders.appendRow([orderId, timestamp, nome, email || '', telefone, bairro, observacoes, JSON.stringify(itens)]);

  for (var id2 in itens) {
    if (!itens.hasOwnProperty(id2)) continue;
    var qty2 = parseInt(itens[id2], 10) || 0;
    if (qty2 <= 0) continue;
    var rowNum = idToRow[id2];
    var novoEstoque = Math.max(0, idToEstoque[id2] - qty2);
    sheetItems.getRange(rowNum, 5).setValue(novoEstoque);
  }

  return jsonResponse({ ok: true, orderId: orderId });
}

/**
 * SETUP INICIAL — Execute esta função UMA VEZ no editor do Apps Script.
 * Opção A: Script vinculado à planilha — abra a planilha, depois Extensões > Apps Script.
 * Opção B: Script solto — em Propriedades do projeto, adicione SPREADSHEET_ID com o ID da planilha
 *          (o ID está na URL: docs.google.com/spreadsheets/d/ESTE_E_O_ID/edit).
 * A primeira aba vira "Items"; Users e Orders são criadas em seguida.
 */
function runSetupPlanilha() {
  var ss = null;
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (spreadsheetId && spreadsheetId.toString().trim() !== '') {
    try {
      ss = SpreadsheetApp.openById(spreadsheetId.toString().trim());
    } catch (e) {
      throw new Error('SPREADSHEET_ID nas propriedades está inválido. URL da planilha: docs.google.com/spreadsheets/d/ID/edit');
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    throw new Error('Nenhuma planilha. (1) Abra a planilha no Sheets e use nela Extensões > Apps Script, OU (2) Em Propriedades do projeto, adicione SPREADSHEET_ID com o ID da planilha (da URL).');
  }

  var planilhaUrl = ss.getUrl();
  var nomePlanilha = ss.getName();

  var sheets = ss.getSheets();
  if (!sheets || sheets.length === 0) {
    throw new Error('A planilha não tem abas.');
  }
  var firstSheet = sheets[0];

  // Usar a primeira aba como Items (renomear, limpar, preencher)
  firstSheet.setName(SHEET_ITEMS);
  firstSheet.clear();
  firstSheet.getRange(1, 1, 1, 7).setValues([['id', 'nome', 'unidade', 'ativo', 'estoque', 'preco', 'ordem']]);
  firstSheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  firstSheet.appendRow(['arroz', 'Arroz integral', 'kg', 'TRUE', 50, 0, 1]);
  firstSheet.appendRow(['feijao', 'Feijão', 'kg', 'TRUE', 30, 0, 2]);
  firstSheet.appendRow(['azeite', 'Azeite extra virgem', 'un', 'TRUE', 20, 0, 3]);
  firstSheet.appendRow(['ovos', 'Ovos caipira', 'dúzia', 'TRUE', 40, 0, 4]);
  firstSheet.appendRow(['verduras', 'Verduras e legumes orgânicos', 'kg', 'TRUE', 25, 0, 5]);

  // Criar aba Users se não existir
  var sheetUsers = ss.getSheetByName(SHEET_USERS);
  if (!sheetUsers) sheetUsers = ss.insertSheet(SHEET_USERS);
  sheetUsers.clear();
  sheetUsers.getRange(1, 1, 1, 5).setValues([['telefone', 'nome', 'endereco', 'documento', 'email']]);
  sheetUsers.getRange(1, 1, 1, 5).setFontWeight('bold');

  // Criar aba Orders se não existir
  var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
  if (!sheetOrders) sheetOrders = ss.insertSheet(SHEET_ORDERS);
  sheetOrders.clear();
  sheetOrders.getRange(1, 1, 1, 8).setValues([['orderId', 'timestamp', 'nome', 'email', 'telefone', 'bairro', 'observacoes', 'itens']]);
  sheetOrders.getRange(1, 1, 1, 8).setFontWeight('bold');

  Logger.log('Planilha alterada: ' + nomePlanilha + ' - ' + planilhaUrl);
  return 'Pronto! Planilha "' + nomePlanilha + '" alterada.\n\nURL desta planilha:\n' + planilhaUrl + '\n\nConfira se a aba do navegador é ESTA mesma URL. Se não for, você estava olhando outra planilha. Abra o link acima e verá Items, Users e Orders.';
}
