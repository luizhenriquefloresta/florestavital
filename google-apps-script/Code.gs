/**
 * Floresta Vital - Compra Coletiva
 * Web App backend: catálogo (Items) e pedidos (Orders) em Google Sheets.
 * Configure ADMIN_TOKEN em Script Properties (Executar > Propriedades do projeto).
 */

var SHEET_ITEMS = 'Items';
var SHEET_ORDERS = 'Orders';
var SHEET_USERS = 'Users';
var SHEET_SEPARACAO = 'Separacao';
var SHEET_SEPARACAO_POR_PEDIDO = 'Separacao por pedido';
var SHEET_PEDIDOS_SEPARADOS = 'Pedidos separados';
var SHEET_PEDIDOS_ENTREGUES = 'Pedidos entregues';
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
  if (action === 'myOrders') {
    var tel = (params.telefone || '').toString().trim();
    return getMyOrders(tel);
  }
  if (action === 'updateOrderStatus') {
    var t = params.token || '';
    if (!isAdminTokenValid(t)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }
    var orderId = (params.orderId || '').toString().trim();
    var status = (params.status || '').toString().trim().toLowerCase();
    if (!orderId || !status) {
      return jsonResponse({ ok: false, error: 'orderId e status são obrigatórios' }, 400);
    }
    return postUpdateOrderStatus({ action: 'updateOrderStatus', orderId: orderId, status: status });
  }

  return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
}

function doPost(e) {
  var blob = e && e.postData && e.postData.contents ? e.postData.contents : null;
  var token = (e && e.parameter && e.parameter.token) || null;

  if (!blob) {
    Logger.log('[doPost] No body');
    return jsonResponse({ ok: false, error: 'No body' }, 400);
  }

  var data;
  try {
    data = JSON.parse(blob);
  } catch (err) {
    Logger.log('[doPost] Invalid JSON: ' + (err.message || err));
    return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400);
  }

  var action = data && data.action;
  Logger.log('[doPost] action=' + (action || '(vazio)'));

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
  if (data.action === 'cancelOrder') {
    return postCancelOrder(data);
  }
  if (data.action === 'updateOrder') {
    return postUpdateOrder(data);
  }
  if (data.action === 'updateOrderStatus') {
    if (!isAdminTokenValid(token)) {
      return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
    }
    try {
      return postUpdateOrderStatus(data);
    } catch (err) {
      Logger.log('[doPost] postUpdateOrderStatus exceção: ' + (err.message || err));
      return jsonResponse({ ok: false, error: 'Erro ao atualizar status: ' + (err.message || String(err)) }, 500);
    }
  }

  Logger.log('[doPost] Unknown action: ' + (action || ''));
  return jsonResponse({ ok: false, error: 'Unknown action', received: action || null }, 400);
}

function isAdminTokenValid(token) {
  if (!token || token.toString().trim() === '') return false;
  var stored = PropertiesService.getScriptProperties().getProperty(PROP_ADMIN_TOKEN);
  return stored && stored.toString().trim() === token.toString().trim();
}

function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id && id.toString().trim() !== '') {
    try {
      var ss = SpreadsheetApp.openById(id.toString().trim());
      Logger.log('[Separacao] getSpreadsheet: usou SPREADSHEET_ID, nome=' + (ss ? ss.getName() : 'null'));
      return ss;
    } catch (e) {
      Logger.log('[Separacao] getSpreadsheet: SPREADSHEET_ID falhou - ' + (e.message || e));
      throw new Error('SPREADSHEET_ID invalido. Verifique o ID na URL da planilha: docs.google.com/spreadsheets/d/ID/edit');
    }
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log('[Separacao] getSpreadsheet: usou getActiveSpreadsheet, ss=' + (ss ? ss.getName() : 'null'));
  if (!ss) {
    throw new Error('Nenhuma planilha. Rode o script pela planilha: menu Compra Coletiva > Atualizar Separacao. Ou em Propriedades do projeto adicione SPREADSHEET_ID.');
  }
  return ss;
}

function getSheet(name) {
  var ss = getSpreadsheet();
  if (!ss) return null;
  var sheet = ss.getSheetByName(name);
  if (!sheet) return null;
  return sheet;
}

/** Normaliza telefone: só dígitos. */
function normalizePhone(t) {
  return (t || '').toString().replace(/\D/g, '');
}

/** Retorna true se dois telefones normalizados são o mesmo (ex.: 11999999999 e 5511999999999). */
function phonesMatch(t1, t2) {
  if (!t1 || !t2) return false;
  if (t1 === t2) return true;
  var a = t1.length >= t2.length ? t1 : t2;
  var b = t1.length >= t2.length ? t2 : t1;
  return a.slice(-b.length) === b;
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
    if (phonesMatch(normalizePhone(data[i][0]), telefone)) {
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
    if (phonesMatch(normalizePhone(dataRows[i][0]), telefone)) {
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
        if (phonesMatch(normalizePhone(rows[i][0]), telefone)) {
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

  var numCols = Math.max(7, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, lastRow, numCols).getValues();
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
        ordem: parseInt(row[6], 10) || 0,
        imagem: row[7] !== undefined && row[7] !== null ? String(row[7] || '').trim() : ''
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

  var numCols = Math.max(7, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, lastRow, numCols).getValues();
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
      ordem: parseInt(row[6], 10) || 0,
      imagem: row[7] !== undefined && row[7] !== null ? String(row[7] || '').trim() : ''
    });
  }
  items.sort(function (a, b) {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem;
    return (a.nome || '').localeCompare(b.nome || '');
  });
  return jsonResponse({ ok: true, items: items });
}

/**
 * Atualiza itens na planilha (estoque, ativo, imagem, e opcionalmente nome/unidade/preco/ordem).
 * items: array de { id, nome?, unidade?, ativo?, estoque?, preco?, ordem?, imagem? }
 */
function postItemsAdmin(items) {
  if (!items || !Array.isArray(items)) {
    return jsonResponse({ ok: false, error: 'items array required' }, 400);
  }
  var sheet = getSheet(SHEET_ITEMS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Sheet Items not found' }, 500);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true });

  if (sheet.getLastColumn() < 8) {
    sheet.getRange(1, 8).setValue('imagem');
  }
  var numCols = Math.max(8, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, lastRow, numCols).getValues();
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
    if (it.hasOwnProperty('imagem')) sheet.getRange(rowNum, 8).setValue(it.imagem != null ? String(it.imagem).trim() : '');
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

  var numCols = Math.max(9, sheet.getLastColumn());
  if (numCols < 9) numCols = 9;
  var startRow = Math.max(2, lastRow - limit + 1);
  var data = sheet.getRange(startRow, 1, lastRow, numCols).getValues();
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
      itens: String(row[7] || '{}'),
      status: row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '' ? String(row[8]).trim().toLowerCase() : 'ativo'
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

  sheetOrders.appendRow([orderId, timestamp, nome, email || '', telefone, bairro, observacoes, JSON.stringify(itens), 'ativo']);

  for (var id2 in itens) {
    if (!itens.hasOwnProperty(id2)) continue;
    var qty2 = parseInt(itens[id2], 10) || 0;
    if (qty2 <= 0) continue;
    var rowNum = idToRow[id2];
    var novoEstoque = Math.max(0, idToEstoque[id2] - qty2);
    sheetItems.getRange(rowNum, 5).setValue(novoEstoque);
  }

  try {
    var ss = getSpreadsheet();
    if (ss) rebuildAllSeparacaoSheets(ss);
  } catch (e) {
    Logger.log('[Separacao] postOrder: erro ao atualizar abas - ' + (e.message || e));
  }

  return jsonResponse({ ok: true, orderId: orderId });
}

/**
 * GET ?action=myOrders&telefone=XXX
 * Lista pedidos do usuário (por telefone). Retorna orderId, timestamp, nome, email, telefone, bairro, observacoes, itens, status.
 */
function getMyOrders(telefoneParam) {
  var telefone = normalizePhone(telefoneParam);
  if (telefone.length < 10) {
    return jsonResponse({ ok: false, error: 'Telefone inválido' }, 400);
  }
  var sheet = getSheet(SHEET_ORDERS);
  if (!sheet) return jsonResponse({ ok: false, error: 'Planilha não configurada' }, 500);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ ok: true, orders: [] });

  var numCols = Math.max(9, sheet.getLastColumn());
  var data = sheet.getRange(2, 1, lastRow, numCols).getValues();
  var orders = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowTel = normalizePhone(String(row[4] || ''));
    if (!phonesMatch(rowTel, telefone)) continue;
    var status = row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '' ? String(row[8]).trim().toLowerCase() : 'ativo';
    orders.push({
      orderId: String(row[0] || ''),
      timestamp: String(row[1] || ''),
      nome: String(row[2] || ''),
      email: String(row[3] || ''),
      telefone: String(row[4] || ''),
      bairro: String(row[5] || ''),
      observacoes: String(row[6] || ''),
      itens: String(row[7] || '{}'),
      status: status
    });
  }
  orders.reverse();
  return jsonResponse({ ok: true, orders: orders });
}

/**
 * Retorna o número da linha (1-based) do pedido ou 0 se não existir.
 */
function findOrderRow(sheet, orderId) {
  if (!sheet || !orderId) return 0;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var ids = sheet.getRange(2, 1, lastRow, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim() === String(orderId).trim()) return i + 2;
  }
  return 0;
}

/**
 * Devolve ao estoque as quantidades do objeto itens (id -> qty).
 */
function restoreStockForItens(itensObj) {
  if (!itensObj || typeof itensObj !== 'object') return;
  var sheetItems = getSheet(SHEET_ITEMS);
  if (!sheetItems) return;
  var lastRow = sheetItems.getLastRow();
  if (lastRow < 2) return;
  var data = sheetItems.getRange(2, 1, lastRow, 5).getValues();
  var idToRow = {};
  for (var i = 0; i < data.length; i++) {
    idToRow[String(data[i][0] || '').trim()] = i + 2;
  }
  for (var id in itensObj) {
    if (!itensObj.hasOwnProperty(id)) continue;
    var qty = parseInt(itensObj[id], 10) || 0;
    if (qty <= 0) continue;
    var rowNum = idToRow[id];
    if (!rowNum) continue;
    var current = parseInt(sheetItems.getRange(rowNum, 5).getValue(), 10) || 0;
    sheetItems.getRange(rowNum, 5).setValue(current + qty);
  }
}

/**
 * POST { action: 'cancelOrder', orderId, telefone }
 * Marca o pedido como cancelado e devolve os itens ao estoque.
 */
function postCancelOrder(data) {
  if (data.action !== 'cancelOrder') {
    return jsonResponse({ ok: false, error: 'action must be cancelOrder' }, 400);
  }
  var orderId = (data.orderId || '').toString().trim();
  var telefone = normalizePhone((data.telefone || '').toString());
  if (!orderId || telefone.length < 10) {
    return jsonResponse({ ok: false, error: 'orderId e telefone são obrigatórios' }, 400);
  }
  var sheetOrders = getSheet(SHEET_ORDERS);
  if (!sheetOrders) return jsonResponse({ ok: false, error: 'Planilha não configurada' }, 500);

  var rowNum = findOrderRow(sheetOrders, orderId);
  if (rowNum === 0) {
    return jsonResponse({ ok: false, error: 'Pedido não encontrado' }, 404);
  }
  var rowTel = normalizePhone(String(sheetOrders.getRange(rowNum, 5).getValue() || ''));
  if (!phonesMatch(rowTel, telefone)) {
    return jsonResponse({ ok: false, error: 'Este pedido não é seu' }, 403);
  }
  var statusCell = sheetOrders.getRange(rowNum, 9);
  var currentStatus = String(statusCell.getValue() || '').trim().toLowerCase();
  if (currentStatus === 'cancelado') {
    return jsonResponse({ ok: true, message: 'Pedido já estava cancelado' });
  }
  var itensStr = String(sheetOrders.getRange(rowNum, 8).getValue() || '{}');
  var itensObj;
  try {
    itensObj = JSON.parse(itensStr);
  } catch (e) {
    itensObj = {};
  }
  restoreStockForItens(itensObj);
  statusCell.setValue('cancelado');
  try {
    var ss = getSpreadsheet();
    if (ss) rebuildAllSeparacaoSheets(ss);
  } catch (e) {}
  return jsonResponse({ ok: true, message: 'Pedido cancelado' });
}

/**
 * POST { action: 'updateOrder', orderId, telefone, itens, bairro?, observacoes? }
 * Atualiza itens (e opcionalmente bairro, observacoes) do pedido e ajusta estoque.
 */
function postUpdateOrder(data) {
  if (data.action !== 'updateOrder') {
    return jsonResponse({ ok: false, error: 'action must be updateOrder' }, 400);
  }
  var orderId = (data.orderId || '').toString().trim();
  var telefone = normalizePhone((data.telefone || '').toString());
  var itens = data.itens;
  if (!orderId || telefone.length < 10) {
    return jsonResponse({ ok: false, error: 'orderId e telefone são obrigatórios' }, 400);
  }
  if (!itens || typeof itens !== 'object') {
    return jsonResponse({ ok: false, error: 'itens obrigatório' }, 400);
  }

  var sheetOrders = getSheet(SHEET_ORDERS);
  var sheetItems = getSheet(SHEET_ITEMS);
  if (!sheetOrders || !sheetItems) {
    return jsonResponse({ ok: false, error: 'Planilha não configurada' }, 500);
  }

  var rowNum = findOrderRow(sheetOrders, orderId);
  if (rowNum === 0) {
    return jsonResponse({ ok: false, error: 'Pedido não encontrado' }, 404);
  }
  var rowTel = normalizePhone(String(sheetOrders.getRange(rowNum, 5).getValue() || ''));
  if (!phonesMatch(rowTel, telefone)) {
    return jsonResponse({ ok: false, error: 'Este pedido não é seu' }, 403);
  }
  var statusCell = sheetOrders.getRange(rowNum, 9);
  if (String(statusCell.getValue() || '').trim().toLowerCase() === 'cancelado') {
    return jsonResponse({ ok: false, error: 'Não é possível editar pedido cancelado' }, 400);
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

  var oldItensStr = String(sheetOrders.getRange(rowNum, 8).getValue() || '{}');
  var oldItens;
  try {
    oldItens = JSON.parse(oldItensStr);
  } catch (e) {
    oldItens = {};
  }
  restoreStockForItens(oldItens);
  for (var id in itens) {
    if (!itens.hasOwnProperty(id)) continue;
    var qty = parseInt(itens[id], 10) || 0;
    if (qty <= 0) continue;
    if (!idToRow[id]) {
      restoreStockForItens(oldItens);
      return jsonResponse({ ok: false, error: 'Item inválido: ' + id }, 400);
    }
    var disponivel = (idToEstoque[id] || 0) + (parseInt(oldItens[id], 10) || 0);
    if (disponivel < qty) {
      restoreStockForItens(oldItens);
      return jsonResponse({ ok: false, error: 'Estoque insuficiente para o item: ' + id }, 400);
    }
  }

  sheetOrders.getRange(rowNum, 8).setValue(JSON.stringify(itens));
  if (data.bairro !== undefined) sheetOrders.getRange(rowNum, 6).setValue(String(data.bairro || '').trim());
  if (data.observacoes !== undefined) sheetOrders.getRange(rowNum, 7).setValue(String(data.observacoes || '').trim());

  for (var id2 in itens) {
    if (!itens.hasOwnProperty(id2)) continue;
    var qty2 = parseInt(itens[id2], 10) || 0;
    if (qty2 <= 0) continue;
    var r = idToRow[id2];
    var estoqueAposDevolucao = (idToEstoque[id2] || 0) + (parseInt(oldItens[id2], 10) || 0);
    var novoEstoque = Math.max(0, estoqueAposDevolucao - qty2);
    sheetItems.getRange(r, 5).setValue(novoEstoque);
  }

  try {
    var ss = getSpreadsheet();
    if (ss) rebuildAllSeparacaoSheets(ss);
  } catch (e) {}
  return jsonResponse({ ok: true, message: 'Pedido atualizado' });
}

/**
 * POST ou GET (action=updateOrderStatus&orderId=...&status=...&token=...).
 * Apenas admin. Altera o status do pedido e reconstrói as abas de separação.
 */
function postUpdateOrderStatus(data) {
  try {
    Logger.log('[updateOrderStatus] inicio orderId=' + (data && data.orderId) + ' status=' + (data && data.status));
    if (!data || data.action !== 'updateOrderStatus') {
      return jsonResponse({ ok: false, error: 'action must be updateOrderStatus' }, 400);
    }
    var orderId = (data.orderId || '').toString().trim();
    var status = (data.status || '').toString().trim().toLowerCase();
    if (!orderId) {
      return jsonResponse({ ok: false, error: 'orderId obrigatório' }, 400);
    }
    if (status !== 'separado' && status !== 'entregue') {
      return jsonResponse({ ok: false, error: 'status deve ser "separado" ou "entregue"' }, 400);
    }
    var sheetOrders = getSheet(SHEET_ORDERS);
    if (!sheetOrders) {
      Logger.log('[updateOrderStatus] Planilha Orders não encontrada');
      return jsonResponse({ ok: false, error: 'Planilha Orders não encontrada' }, 500);
    }
    var rowNum = findOrderRow(sheetOrders, orderId);
    if (rowNum === 0) {
      Logger.log('[updateOrderStatus] Pedido não encontrado: ' + orderId);
      return jsonResponse({ ok: false, error: 'Pedido não encontrado' }, 404);
    }
    var statusCell = sheetOrders.getRange(rowNum, 9);
    var currentStatus = String(statusCell.getValue() || '').trim().toLowerCase();
    if (currentStatus === 'cancelado') {
      return jsonResponse({ ok: false, error: 'Não é possível alterar status de pedido cancelado' }, 400);
    }
    statusCell.setValue(status);
    Logger.log('[updateOrderStatus] status gravado: ' + status);
    try {
      var ss = getSpreadsheet();
      if (ss) rebuildAllSeparacaoSheets(ss);
    } catch (e) {
      Logger.log('[updateOrderStatus] erro ao atualizar abas - ' + (e.message || e));
    }
    return jsonResponse({ ok: true, message: 'Status atualizado para ' + status });
  } catch (err) {
    Logger.log('[updateOrderStatus] exceção: ' + (err.message || err));
    return jsonResponse({ ok: false, error: 'Erro interno: ' + (err.message || String(err)) }, 500);
  }
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
  firstSheet.getRange(1, 1, 1, 8).setValues([['id', 'nome', 'unidade', 'ativo', 'estoque', 'preco', 'ordem', 'imagem']]);
  firstSheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  firstSheet.appendRow(['arroz', 'Arroz integral', 'kg', 'TRUE', 50, 0, 1, '']);
  firstSheet.appendRow(['feijao', 'Feijão', 'kg', 'TRUE', 30, 0, 2, '']);
  firstSheet.appendRow(['azeite', 'Azeite extra virgem', 'un', 'TRUE', 20, 0, 3, '']);
  firstSheet.appendRow(['ovos', 'Ovos caipira', 'dúzia', 'TRUE', 40, 0, 4, '']);
  firstSheet.appendRow(['verduras', 'Verduras e legumes orgânicos', 'kg', 'TRUE', 25, 0, 5, '']);

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
  sheetOrders.getRange(1, 1, 1, 9).setValues([['orderId', 'timestamp', 'nome', 'email', 'telefone', 'bairro', 'observacoes', 'itens', 'status']]);
  sheetOrders.getRange(1, 1, 1, 9).setFontWeight('bold');

  Logger.log('Planilha alterada: ' + nomePlanilha + ' - ' + planilhaUrl);
  return 'Pronto! Planilha "' + nomePlanilha + '" alterada.\n\nURL desta planilha:\n' + planilhaUrl + '\n\nConfira se a aba do navegador é ESTA mesma URL. Se não for, você estava olhando outra planilha. Abra o link acima e verá Items, Users e Orders.';
}

/**
 * Lê Orders + Items e retorna { linhasPorItem: [], linhas: [] } para as abas Separacao e Separacao por pedido.
 * Usado por runAtualizarSeparacao e por postOrder (atualização automática ao criar pedido).
 */
function buildDadosSeparacao(ss) {
  var ssResolvidoAqui = false;
  Logger.log('[Separacao] buildDadosSeparacao: inicio, ss=' + !!ss);
  if (!ss || typeof ss.getSheetByName !== 'function') {
    Logger.log('[Separacao] buildDadosSeparacao: ss invalido, tentando getSpreadsheet()');
    try {
      ss = getSpreadsheet();
      ssResolvidoAqui = true;
    } catch (e) {
      Logger.log('[Separacao] buildDadosSeparacao: getSpreadsheet falhou - ' + (e.message || e));
      return null;
    }
  }
  if (!ss || typeof ss.getSheetByName !== 'function') {
    Logger.log('[Separacao] buildDadosSeparacao: ss ainda invalido, retorna null');
    return null;
  }
  Logger.log('[Separacao] buildDadosSeparacao: ss OK nome=' + ss.getName());
  var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
  var sheetItems = ss.getSheetByName(SHEET_ITEMS);
  if (!sheetOrders || !sheetItems) {
    Logger.log('[Separacao] buildDadosSeparacao: Orders=' + !!sheetOrders + ' Items=' + !!sheetItems + ', retorna null');
    return null;
  }
  var lastOrder = sheetOrders.getLastRow();
  var lastItem = sheetItems.getLastRow();
  Logger.log('[Separacao] buildDadosSeparacao: lastOrder=' + lastOrder + ' lastItem=' + lastItem);
  if (lastOrder < 2) {
    Logger.log('[Separacao] buildDadosSeparacao: sem pedidos, retorna []');
    return { linhasPorItem: [], linhas: [] };
  }

  var numColsOrder = Math.max(9, sheetOrders.getLastColumn());
  var orderData = sheetOrders.getRange(2, 1, lastOrder, numColsOrder).getValues();
  var numColsItem = Math.min(8, Math.max(6, sheetItems.getLastColumn()));
  var itemData = lastItem >= 2 ? sheetItems.getRange(2, 1, lastItem, numColsItem).getValues() : [];
  Logger.log('[Separacao] buildDadosSeparacao: orderData.rows=' + orderData.length + ' itemData.rows=' + itemData.length);
  var idToNome = {};
  var idToUnidade = {};
  var idToPreco = {};
  for (var i = 0; i < itemData.length; i++) {
    var id = String(itemData[i][0] || '').trim();
    idToNome[id] = String(itemData[i][1] || '').trim();
    idToUnidade[id] = String(itemData[i][2] || '').trim();
    idToPreco[id] = parseFloat(itemData[i][5]) || 0;
  }

  var linhas = [];
  var agregadoPorItem = {};
  for (var o = 0; o < orderData.length; o++) {
    var row = orderData[o];
    var status = (row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '') ? String(row[8]).trim().toLowerCase() : 'ativo';
    if (status !== 'ativo') continue;

    var orderId = String(row[0] || '').trim();
    var nome = String(row[2] || '').trim();
    var email = String(row[3] || '').trim();
    var telefone = String(row[4] || '').trim();
    var bairro = String(row[5] || '').trim();
    var observacoes = String(row[6] || '').trim();
    var itensStr = String(row[7] || '{}');
    var itensObj;
    try {
      itensObj = JSON.parse(itensStr);
    } catch (e) {
      itensObj = {};
    }
    for (var itemId in itensObj) {
      if (!itensObj.hasOwnProperty(itemId)) continue;
      var qty = parseInt(itensObj[itemId], 10) || 0;
      if (qty <= 0) continue;
      var precoUn = idToPreco[itemId] != null ? idToPreco[itemId] : 0;
      var totalLinha = precoUn * qty;
      linhas.push([
        orderId,
        nome,
        telefone,
        email,
        bairro,
        observacoes,
        itemId,
        idToNome[itemId] != null ? idToNome[itemId] : itemId,
        idToUnidade[itemId] != null ? idToUnidade[itemId] : '',
        qty,
        precoUn,
        totalLinha
      ]);
      if (!agregadoPorItem[itemId]) {
        agregadoPorItem[itemId] = { qty: 0, nome: idToNome[itemId] != null ? idToNome[itemId] : itemId, unidade: idToUnidade[itemId] != null ? idToUnidade[itemId] : '', preco: precoUn };
      }
      agregadoPorItem[itemId].qty += qty;
    }
  }

  var linhasPorItem = [];
  for (var itemId in agregadoPorItem) {
    if (!agregadoPorItem.hasOwnProperty(itemId)) continue;
    var a = agregadoPorItem[itemId];
    linhasPorItem.push([itemId, a.nome, a.unidade, a.qty, a.preco, a.qty * a.preco]);
  }
  Logger.log('[Separacao] buildDadosSeparacao: retorna linhasPorItem=' + linhasPorItem.length + ' linhas=' + linhas.length);
  if (ssResolvidoAqui) {
    Logger.log('[Separacao] buildDadosSeparacao: chamando rebuildAllSeparacaoSheets (foi executado sem runAtualizarSeparacao)');
    rebuildAllSeparacaoSheets(ss);
  }
  return { linhasPorItem: linhasPorItem, linhas: linhas };
}

/**
 * Gera linhas no formato "Separacao por pedido" apenas para pedidos com o status indicado (ex.: 'separado', 'entregue').
 * Retorna { linhas: [] }.
 */
function buildDadosLinhasPorStatus(ss, statusFilter) {
  if (!ss || typeof ss.getSheetByName !== 'function') return { linhas: [] };
  var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
  var sheetItems = ss.getSheetByName(SHEET_ITEMS);
  if (!sheetOrders || !sheetItems) return { linhas: [] };
  var lastOrder = sheetOrders.getLastRow();
  var lastItem = sheetItems.getLastRow();
  if (lastOrder < 2) return { linhas: [] };

  var numColsOrder = Math.max(9, sheetOrders.getLastColumn());
  var orderData = sheetOrders.getRange(2, 1, lastOrder, numColsOrder).getValues();
  var numColsItem = Math.min(8, Math.max(6, sheetItems.getLastColumn()));
  var itemData = lastItem >= 2 ? sheetItems.getRange(2, 1, lastItem, numColsItem).getValues() : [];
  var idToNome = {};
  var idToUnidade = {};
  var idToPreco = {};
  for (var i = 0; i < itemData.length; i++) {
    var id = String(itemData[i][0] || '').trim();
    idToNome[id] = String(itemData[i][1] || '').trim();
    idToUnidade[id] = String(itemData[i][2] || '').trim();
    idToPreco[id] = parseFloat(itemData[i][5]) || 0;
  }

  var linhas = [];
  for (var o = 0; o < orderData.length; o++) {
    var row = orderData[o];
    var status = (row[8] !== undefined && row[8] !== null && String(row[8]).trim() !== '') ? String(row[8]).trim().toLowerCase() : 'ativo';
    if (status !== statusFilter) continue;

    var orderId = String(row[0] || '').trim();
    var nome = String(row[2] || '').trim();
    var email = String(row[3] || '').trim();
    var telefone = String(row[4] || '').trim();
    var bairro = String(row[5] || '').trim();
    var observacoes = String(row[6] || '').trim();
    var itensStr = String(row[7] || '{}');
    var itensObj;
    try {
      itensObj = JSON.parse(itensStr);
    } catch (e) {
      itensObj = {};
    }
    for (var itemId in itensObj) {
      if (!itensObj.hasOwnProperty(itemId)) continue;
      var qty = parseInt(itensObj[itemId], 10) || 0;
      if (qty <= 0) continue;
      var precoUn = idToPreco[itemId] != null ? idToPreco[itemId] : 0;
      var totalLinha = precoUn * qty;
      linhas.push([
        orderId,
        nome,
        telefone,
        email,
        bairro,
        observacoes,
        itemId,
        idToNome[itemId] != null ? idToNome[itemId] : itemId,
        idToUnidade[itemId] != null ? idToUnidade[itemId] : '',
        qty,
        precoUn,
        totalLinha
      ]);
    }
  }
  return { linhas: linhas };
}

/**
 * Reconstrói as 4 abas de separação: Separacao, Separacao por pedido (só ativo), Pedidos separados, Pedidos entregues.
 * Retorna { linhasPorItem, linhas, linhasSep, linhasEnt } (contagens) ou null em caso de falha.
 */
function rebuildAllSeparacaoSheets(ss) {
  if (!ss || typeof ss.getSheetByName !== 'function') {
    try {
      ss = getSpreadsheet();
    } catch (e) {
      Logger.log('[Separacao] rebuildAllSeparacaoSheets: getSpreadsheet falhou - ' + (e.message || e));
      return null;
    }
  }
  var dados = buildDadosSeparacao(ss);
  var linhasPorItem = (dados && dados.linhasPorItem) ? dados.linhasPorItem : [];
  var linhas = (dados && dados.linhas) ? dados.linhas : [];
  var sep = buildDadosLinhasPorStatus(ss, 'separado');
  var ent = buildDadosLinhasPorStatus(ss, 'entregue');
  criarOuLimparSeparacao(ss, linhasPorItem, linhas, sep.linhas || [], ent.linhas || []);
  return { linhasPorItem: linhasPorItem, linhas: linhas, linhasSep: sep.linhas || [], linhasEnt: ent.linhas || [] };
}

/**
 * Cria ou atualiza as abas Separacao (por item), Separacao por pedido, Pedidos separados e Pedidos entregues.
 * Execute pelo menu da planilha ou chame após criar/cancelar/editar pedido ou alterar status.
 */
function runAtualizarSeparacao() {
  Logger.log('[Separacao] runAtualizarSeparacao: INICIO');
  try {
    var ss = getSpreadsheet();
    Logger.log('[Separacao] runAtualizarSeparacao: getSpreadsheet retornou ss=' + !!ss + (ss ? ' nome=' + ss.getName() : ''));
    if (!ss) {
      throw new Error('Nenhuma planilha ativa. Se o script não está vinculado à planilha, vá em Executar > Propriedades do projeto e adicione SPREADSHEET_ID com o ID da planilha (está na URL: docs.google.com/spreadsheets/d/ESTE_ID/edit).');
    }

    var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
    var sheetItems = ss.getSheetByName(SHEET_ITEMS);
    Logger.log('[Separacao] runAtualizarSeparacao: sheetOrders=' + !!sheetOrders + ' sheetItems=' + !!sheetItems);
    if (!sheetOrders || !sheetItems) {
      throw new Error('Abas "Orders" e "Items" são obrigatórias. Verifique se elas existem na planilha.');
    }

    var lastOrder = sheetOrders.getLastRow();
    Logger.log('[Separacao] runAtualizarSeparacao: lastOrder=' + lastOrder);
    if (lastOrder < 2) {
      Logger.log('[Separacao] runAtualizarSeparacao: sem pedidos, chama criarOuLimparSeparacao vazio');
      criarOuLimparSeparacao(ss, [], [], [], []);
      return 'Separação atualizada. Nenhum pedido na planilha.';
    }

    Logger.log('[Separacao] runAtualizarSeparacao: chamando rebuildAllSeparacaoSheets');
    var res = rebuildAllSeparacaoSheets(ss);
    Logger.log('[Separacao] runAtualizarSeparacao: FIM OK');
    if (res) {
      return 'Separação atualizada. Ativo: ' + (res.linhasPorItem ? res.linhasPorItem.length : 0) + ' item(ns), ' + (res.linhas ? res.linhas.length : 0) + ' linha(s). Separados: ' + (res.linhasSep ? res.linhasSep.length : 0) + ' linhas. Entregues: ' + (res.linhasEnt ? res.linhasEnt.length : 0) + ' linhas.';
    }
    return 'Separação atualizada.';
  } catch (e) {
    Logger.log('[Separacao] runAtualizarSeparacao: ERRO - ' + (e.message || e));
    var msg = e.message || String(e);
    throw new Error('Atualizar Separação: ' + msg);
  }
}

var SEPARACAO_HEADERS_porItem = ['item_id', 'item_nome', 'unidade', 'quantidade_total', 'valor_unit', 'total'];
var SEPARACAO_HEADERS_porPedido = [
  'orderId', 'nome', 'telefone', 'email', 'bairro', 'observacoes',
  'item_id', 'item_nome', 'unidade', 'quantidade', 'valor_unit', 'total'
];

function criarOuLimparSeparacao(ss, linhasPorItem, linhasPorPedido, linhasPedidosSeparados, linhasPedidosEntregues) {
  if (!ss || typeof ss.getSheetByName !== 'function') {
    Logger.log('[Separacao] criarOuLimparSeparacao: ss invalido, tentando getSpreadsheet()');
    try {
      ss = getSpreadsheet();
    } catch (e) {
      Logger.log('[Separacao] criarOuLimparSeparacao: getSpreadsheet falhou - ' + (e.message || e));
      return;
    }
  }
  if (!ss || typeof ss.getSheetByName !== 'function') {
    Logger.log('[Separacao] criarOuLimparSeparacao: ABORTADO (ss ainda invalido)');
    return;
  }
  Logger.log('[Separacao] criarOuLimparSeparacao: ss OK nome=' + ss.getName());
  linhasPorItem = linhasPorItem || [];
  linhasPorPedido = linhasPorPedido || [];
  linhasPedidosSeparados = linhasPedidosSeparados || [];
  linhasPedidosEntregues = linhasPedidosEntregues || [];
  Logger.log('[Separacao] criarOuLimparSeparacao: linhasPorItem=' + linhasPorItem.length + ' linhasPorPedido=' + linhasPorPedido.length + ' separados=' + linhasPedidosSeparados.length + ' entregues=' + linhasPedidosEntregues.length);

  function writeSheetPorPedido(sheet, linhas) {
    sheet.clear();
    sheet.getRange(1, 1, 1, SEPARACAO_HEADERS_porPedido.length).setValues([SEPARACAO_HEADERS_porPedido]);
    sheet.getRange(1, 1, 1, SEPARACAO_HEADERS_porPedido.length).setFontWeight('bold');
    if (linhas.length > 0) {
      var rowsPorPedido = [];
      var lastOrderId = null;
      for (var i = 0; i < linhas.length; i++) {
        var orderId = linhas[i][0];
        if (lastOrderId !== null && orderId !== lastOrderId) {
          rowsPorPedido.push(['', '', '', '', '', '', '', '', '', '', '', '']);
        }
        lastOrderId = orderId;
        rowsPorPedido.push(linhas[i]);
      }
      if (rowsPorPedido.length > 0) {
        sheet.getRange(2, 1, rowsPorPedido.length + 1, SEPARACAO_HEADERS_porPedido.length).setValues(rowsPorPedido);
      }
    }
  }

  try {
    var sheetGeral = ss.getSheetByName(SHEET_SEPARACAO);
    if (!sheetGeral) sheetGeral = ss.insertSheet(SHEET_SEPARACAO);
    sheetGeral.clear();
    sheetGeral.getRange(1, 1, 1, SEPARACAO_HEADERS_porItem.length).setValues([SEPARACAO_HEADERS_porItem]);
    sheetGeral.getRange(1, 1, 1, SEPARACAO_HEADERS_porItem.length).setFontWeight('bold');
    if (linhasPorItem.length > 0) {
      sheetGeral.getRange(2, 1, linhasPorItem.length + 1, SEPARACAO_HEADERS_porItem.length).setValues(linhasPorItem);
    }
    Logger.log('[Separacao] criarOuLimparSeparacao: aba Separacao OK');

    var sheetPorPedido = ss.getSheetByName(SHEET_SEPARACAO_POR_PEDIDO);
    if (!sheetPorPedido) sheetPorPedido = ss.insertSheet(SHEET_SEPARACAO_POR_PEDIDO);
    writeSheetPorPedido(sheetPorPedido, linhasPorPedido);

    var sheetSeparados = ss.getSheetByName(SHEET_PEDIDOS_SEPARADOS);
    if (!sheetSeparados) sheetSeparados = ss.insertSheet(SHEET_PEDIDOS_SEPARADOS);
    writeSheetPorPedido(sheetSeparados, linhasPedidosSeparados);

    var sheetEntregues = ss.getSheetByName(SHEET_PEDIDOS_ENTREGUES);
    if (!sheetEntregues) sheetEntregues = ss.insertSheet(SHEET_PEDIDOS_ENTREGUES);
    writeSheetPorPedido(sheetEntregues, linhasPedidosEntregues);

    Logger.log('[Separacao] criarOuLimparSeparacao: 4 abas escritas com sucesso');
  } catch (err) {
    Logger.log('[Separacao] criarOuLimparSeparacao: ERRO ao escrever - ' + (err.message || err));
    throw err;
  }
}

/**
 * Teste 0 - so escreve no log. Rode e veja em Execucoes > esta execucao > Log.
 * Se aparecer "Script rodou OK" no log, o problema e ao acessar a planilha (autorizacao ou script standalone).
 */
function runTesteSoLog() {
  Logger.log('Script rodou OK - sem acessar planilha');
  return 'Veja o log (Execucoes > clique na execucao > Log). Deve aparecer: Script rodou OK';
}

/**
 * Teste 1 - pega a planilha ativa. Rode runTesteSoLog primeiro; se der certo, rode este.
 * Na PRIMEIRA vez que acessar a planilha o Google abre uma janela pedindo autorizacao:
 * clique em "Revisar permissoes" > escolha sua conta > "Avançado" > "Ir para ... (nao seguro)" > Permitir.
 * Se a janela nao aparecer, desbloqueie pop-ups para script.google.com
 */
function runTestarConexao() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    return 'ERRO: Nenhuma planilha ativa. Crie o script pela planilha: Arquivo da planilha > Extensoes > Apps Script (nao um projeto novo em script.google.com). Ou em Propriedades do projeto adicione SPREADSHEET_ID.';
  }
  var nome = ss.getName();
  var sheetOrders = ss.getSheetByName(SHEET_ORDERS);
  var sheetItems = ss.getSheetByName(SHEET_ITEMS);
  return 'OK: planilha "' + nome + '". Orders=' + (sheetOrders ? 'sim' : 'nao') + ', Items=' + (sheetItems ? 'sim' : 'nao');
}

/**
 * Menu na planilha: Compra Coletiva > Atualizar Separação
 * Ativar: defina o gatilho onOpen no projeto ou execute runAtualizarSeparacao manualmente.
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      ui.createMenu('Compra Coletiva')
        .addItem('Atualizar Separação (pedidos em linhas)', 'runAtualizarSeparacao')
        .addToUi();
    }
  } catch (e) {
    Logger.log('onOpen: ' + (e.message || e));
  }
}
