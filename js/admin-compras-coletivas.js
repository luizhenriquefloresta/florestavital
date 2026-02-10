/**
 * Admin Compra Coletiva - Login por token, gestão de itens e visualização de pedidos.
 * Token não fica no código; o usuário digita na tela de login (guardado em sessionStorage).
 */
(function () {
  var STORAGE_TOKEN = 'admin_cc_token';
  var apiBase = typeof COMPRAS_COLETIVAS_API !== 'undefined' ? COMPRAS_COLETIVAS_API : '';

  var elLogin = document.getElementById('adminLogin');
  var elPainel = document.getElementById('adminPainel');
  var elTokenInput = document.getElementById('adminToken');
  var elBtnEntrar = document.getElementById('adminBtnEntrar');
  var elBtnSair = document.getElementById('adminBtnSair');
  var elMsg = document.getElementById('adminMsg');
  var elItensTable = document.getElementById('adminItensTable');
  var elBtnSalvar = document.getElementById('adminBtnSalvar');
  var elOrdersTable = document.getElementById('adminOrdersTable');
  var elBtnExportCsv = document.getElementById('adminBtnExportCsv');
  var elResumoItens = document.getElementById('adminResumoItens');
  var elBtnSalvarBackup = document.getElementById('adminBtnSalvarBackup');
  var elSelectBackup = document.getElementById('adminSelectBackup');
  var elBtnRestaurarBackup = document.getElementById('adminBtnRestaurarBackup');
  var elBackupMsg = document.getElementById('adminBackupMsg');

  function getToken() {
    return sessionStorage.getItem(STORAGE_TOKEN) || '';
  }

  function setToken(t) {
    if (t) sessionStorage.setItem(STORAGE_TOKEN, t);
    else sessionStorage.removeItem(STORAGE_TOKEN);
  }

  function showMsg(text, isError) {
    if (!elMsg) return;
    elMsg.textContent = text;
    elMsg.className = 'admin-msg ' + (isError ? 'admin-msg-error' : 'admin-msg-ok');
    elMsg.setAttribute('aria-live', 'polite');
  }

  function showPainel(show) {
    if (elLogin) elLogin.style.display = show ? 'none' : 'block';
    if (elPainel) elPainel.style.display = show ? 'block' : 'none';
  }

  function checkAuth() {
    var token = getToken();
    if (!token) {
      showPainel(false);
      return;
    }
    fetch(apiBase + '?action=verify&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          showPainel(true);
          loadItens();
          loadOrders();
          loadBackups();
        } else {
          setToken('');
          showPainel(false);
          showMsg('Token inválido ou expirado.', true);
        }
      })
      .catch(function () {
        setToken('');
        showPainel(false);
        showMsg('Erro de conexão. Verifique a URL da API em js/config.js.', true);
      });
  }

  function login(e) {
    e.preventDefault();
    var token = (elTokenInput && elTokenInput.value || '').trim();
    if (!token) {
      showMsg('Digite o token de administrador.', true);
      return;
    }
    fetch(apiBase + '?action=verify&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          setToken(token);
          showMsg('');
          showPainel(true);
          loadItens();
          loadOrders();
          loadBackups();
        } else {
          showMsg('Token inválido.', true);
        }
      })
      .catch(function () {
        showMsg('Erro de conexão.', true);
      });
  }

  function logout() {
    setToken('');
    showPainel(false);
    if (elTokenInput) elTokenInput.value = '';
    showMsg('');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var currentItems = [];

  function renderItens(items) {
    currentItems = items || [];
    if (!elItensTable) return;
    var tbody = elItensTable.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhum item na planilha.</td></tr>';
      return;
    }
    items.forEach(function (it) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><code>' + escapeHtml(it.id) + '</code></td>' +
        '<td><input type="text" class="admin-input admin-nome" value="' + escapeHtml(it.nome) + '" data-id="' + escapeHtml(it.id) + '" aria-label="Nome do item"></td>' +
        '<td><input type="text" class="admin-input admin-unidade" value="' + escapeHtml(it.unidade) + '" data-id="' + escapeHtml(it.id) + '" style="width:70px" aria-label="Unidade"></td>' +
        '<td><input type="checkbox" class="admin-ativo" ' + (it.ativo ? 'checked' : '') + ' data-id="' + escapeHtml(it.id) + '" aria-label="Item ativo"></td>' +
        '<td><input type="number" min="0" class="admin-input admin-estoque" value="' + (it.estoque || 0) + '" data-id="' + escapeHtml(it.id) + '" style="width:70px" aria-label="Estoque"></td>' +
        '<td><input type="number" min="0" step="0.01" class="admin-input admin-preco" value="' + (it.preco || '') + '" data-id="' + escapeHtml(it.id) + '" style="width:70px" aria-label="Preço"></td>' +
        '<td><input type="number" min="0" class="admin-input admin-ordem" value="' + (it.ordem || 0) + '" data-id="' + escapeHtml(it.id) + '" style="width:50px" aria-label="Ordem"></td>' +
        '<td><input type="url" class="admin-input admin-imagem" value="' + escapeHtml(it.imagem || '') + '" data-id="' + escapeHtml(it.id) + '" placeholder="https://…" style="max-width:180px" aria-label="URL da imagem"></td>';
      tbody.appendChild(tr);
    });
  }

  function loadItens() {
    var token = getToken();
    if (!token) return;
    fetch(apiBase + '?action=adminItems&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.items) {
          renderItens(data.items);
        } else {
          renderItens([]);
          showMsg('Não foi possível carregar itens.', true);
        }
      })
      .catch(function () {
        renderItens([]);
        showMsg('Erro ao carregar itens.', true);
      });
  }

  function collectItemsFromForm() {
    var rows = elItensTable && elItensTable.querySelectorAll('tbody tr');
    if (!rows || rows.length === 0) return currentItems.map(function (it) {
      return { id: it.id, nome: it.nome, unidade: it.unidade, ativo: it.ativo, estoque: it.estoque, preco: it.preco, ordem: it.ordem, imagem: it.imagem || '' };
    });
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var id = rows[i].querySelector('[data-id]') && rows[i].querySelector('[data-id]').getAttribute('data-id');
      if (!id) continue;
      var nome = (rows[i].querySelector('.admin-nome') && rows[i].querySelector('.admin-nome').value || '').trim();
      var unidade = (rows[i].querySelector('.admin-unidade') && rows[i].querySelector('.admin-unidade').value || '').trim();
      var ativo = rows[i].querySelector('.admin-ativo') && rows[i].querySelector('.admin-ativo').checked;
      var estoque = parseInt(rows[i].querySelector('.admin-estoque') && rows[i].querySelector('.admin-estoque').value, 10);
      var preco = parseFloat(rows[i].querySelector('.admin-preco') && rows[i].querySelector('.admin-preco').value);
      var ordem = parseInt(rows[i].querySelector('.admin-ordem') && rows[i].querySelector('.admin-ordem').value, 10);
      var imagem = (rows[i].querySelector('.admin-imagem') && rows[i].querySelector('.admin-imagem').value || '').trim();
      out.push({
        id: id,
        nome: nome,
        unidade: unidade,
        ativo: ativo,
        estoque: isNaN(estoque) ? 0 : estoque,
        preco: isNaN(preco) ? 0 : preco,
        ordem: isNaN(ordem) ? 0 : ordem,
        imagem: imagem
      });
    }
    return out;
  }

  function saveItens(e) {
    e.preventDefault();
    var token = getToken();
    if (!token) return logout();
    var items = collectItemsFromForm();
    if (items.length === 0) {
      showMsg('Nenhum item para salvar.', true);
      return;
    }
    elBtnSalvar.disabled = true;
    elBtnSalvar.textContent = 'Salvando…';
    fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'adminItems', token: token, items: items })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        elBtnSalvar.disabled = false;
        elBtnSalvar.textContent = 'Salvar alterações';
        if (data && data.ok) {
          showMsg('Alterações salvas com sucesso.', false);
          loadItens();
        } else {
          showMsg((data && data.error) || 'Erro ao salvar.', true);
        }
      })
      .catch(function () {
        elBtnSalvar.disabled = false;
        elBtnSalvar.textContent = 'Salvar alterações';
        showMsg('Erro de conexão.', true);
      });
  }

  var currentOrders = [];

  function loadOrders() {
    var token = getToken();
    if (!token) return;
    fetch(apiBase + '?action=orders&token=' + encodeURIComponent(token) + '&limit=20')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.orders) {
          currentOrders = data.orders;
          renderOrders(data.orders);
          renderResumoItens(data.orders);
        } else {
          currentOrders = [];
          renderOrders([]);
          renderResumoItens([]);
        }
      })
      .catch(function () {
        currentOrders = [];
        renderOrders([]);
        renderResumoItens([]);
      });
  }

  function renderResumoItens(orders) {
    if (!elResumoItens) return;
    var totals = {};
    orders.forEach(function (o) {
      var it;
      try {
        it = typeof o.itens === 'string' ? JSON.parse(o.itens) : (o.itens || {});
      } catch (e) { it = {}; }
      for (var k in it) if (it.hasOwnProperty(k)) {
        totals[k] = (totals[k] || 0) + (parseInt(it[k], 10) || 0);
      }
    });
    var keys = Object.keys(totals).sort();
    if (keys.length === 0) {
      elResumoItens.innerHTML = '<p style="color: var(--text-soft); font-size: 0.9rem;">Nenhum item nos últimos pedidos.</p>';
      return;
    }
    var html = '<table class="admin-table"><thead><tr><th>Item (id)</th><th>Total qtd.</th></tr></thead><tbody>';
    keys.forEach(function (k) {
      html += '<tr><td><code>' + escapeHtml(k) + '</code></td><td>' + totals[k] + '</td></tr>';
    });
    html += '</tbody></table>';
    elResumoItens.innerHTML = '<p style="font-size: 0.9rem; color: var(--text-soft); margin-bottom: var(--space-sm);">Resumo agregado pelos últimos 20 pedidos:</p>' + html;
  }

  function statusLabel(s) {
    if (!s) return 'Ativo';
    s = String(s).toLowerCase();
    if (s === 'cancelado') return 'Cancelado';
    if (s === 'separado') return 'Separado';
    if (s === 'entregue') return 'Entregue';
    return 'Ativo';
  }

  function statusBadgeClass(s) {
    s = (s || '').toString().toLowerCase();
    if (s === 'cancelado') return 'admin-status-cancelado';
    if (s === 'separado') return 'admin-status-separado';
    if (s === 'entregue') return 'admin-status-entregue';
    return 'admin-status-ativo';
  }

  function renderOrders(orders) {
    var tbody = elOrdersTable && elOrdersTable.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9">Nenhum pedido recente.</td></tr>';
      return;
    }
    orders.forEach(function (o) {
      var itensStr = '';
      try {
        var it = typeof o.itens === 'string' ? JSON.parse(o.itens) : (o.itens || {});
        itensStr = Object.keys(it).map(function (k) { return k + ': ' + it[k]; }).join('; ');
      } catch (e) {
        itensStr = o.itens || '';
      }
      var status = (o.status || '').toLowerCase();
      var statusBadge = '<span class="admin-status-badge ' + statusBadgeClass(o.status) + '">' + escapeHtml(statusLabel(o.status)) + '</span>';
      var acoes = '';
      if (status === 'ativo') {
        acoes = '<button type="button" class="btn btn-secondary admin-btn-separado admin-acoes-next" data-order-id="' + escapeHtml(o.orderId) + '" title="Pedido entra na aba Pedidos separados">→ Separado</button>';
      } else if (status === 'separado') {
        acoes = '<button type="button" class="btn btn-primary admin-btn-entregue admin-acoes-next" data-order-id="' + escapeHtml(o.orderId) + '" title="Pedido entra na aba Pedidos entregues">→ Entregue</button>';
      } else if (status === 'entregue') {
        acoes = '<span class="admin-acoes-done" title="Pedido na aba Pedidos entregues">✓ Entregue</span>';
      } else if (status === 'cancelado') {
        acoes = '<span class="admin-acoes-done">Cancelado</span>';
      } else {
        acoes = '<button type="button" class="btn btn-secondary admin-btn-separado" data-order-id="' + escapeHtml(o.orderId) + '">→ Separado</button>';
      }
      var tr = document.createElement('tr');
      tr.setAttribute('data-status', status);
      tr.innerHTML =
        '<td><code>' + escapeHtml(o.orderId) + '</code></td>' +
        '<td>' + escapeHtml(o.timestamp) + '</td>' +
        '<td>' + escapeHtml(o.nome) + '</td>' +
        '<td>' + escapeHtml(o.email) + '</td>' +
        '<td>' + escapeHtml(o.telefone) + '</td>' +
        '<td>' + escapeHtml(o.bairro) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td style="font-size:0.85rem;">' + escapeHtml(itensStr) + '</td>' +
        '<td class="admin-cell-acoes">' + acoes + '</td>';
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.admin-btn-separado').forEach(function (btn) {
      btn.addEventListener('click', function () { setOrderStatus(btn.getAttribute('data-order-id'), 'separado', btn); });
    });
    tbody.querySelectorAll('.admin-btn-entregue').forEach(function (btn) {
      btn.addEventListener('click', function () { setOrderStatus(btn.getAttribute('data-order-id'), 'entregue', btn); });
    });
  }

  function setOrderStatus(orderId, status, clickedBtn) {
    var token = getToken();
    if (!token) return logout();
    if (clickedBtn) {
      clickedBtn.disabled = true;
      clickedBtn.textContent = 'Salvando…';
    }
    var sep = apiBase.indexOf('?') >= 0 ? '&' : '?';
    var urlWithAction = apiBase + sep + 'action=updateOrderStatus';
    var body = { action: 'updateOrderStatus', token: token, orderId: orderId, status: status };
    fetch(urlWithAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          var msg = status === 'separado'
            ? 'Status: Separado. Pedido na aba "Pedidos separados".'
            : 'Status: Entregue. Pedido na aba "Pedidos entregues".';
          showMsg(msg, false);
          loadOrders();
        } else {
          var errMsg = (data && data.error) || 'Erro ao atualizar status.';
          if (data && data.received !== undefined && data.received !== null) {
            errMsg += ' (recebido: "' + String(data.received) + '")';
          }
          showMsg(errMsg, true);
          if (clickedBtn) {
            clickedBtn.disabled = false;
            clickedBtn.textContent = status === 'separado' ? '→ Separado' : '→ Entregue';
          }
        }
      })
      .catch(function () {
        showMsg('Erro de conexão. Verifique js/config.js e se o backend foi implantado (nova versão).', true);
        if (clickedBtn) {
          clickedBtn.disabled = false;
          clickedBtn.textContent = status === 'separado' ? '→ Separado' : '→ Entregue';
        }
      });
  }

  function showBackupMsg(text, isError) {
    if (!elBackupMsg) return;
    elBackupMsg.textContent = text;
    elBackupMsg.className = 'admin-msg ' + (isError ? 'admin-msg-error' : 'admin-msg-ok');
    elBackupMsg.style.display = text ? 'block' : 'none';
  }

  function loadBackups() {
    var token = getToken();
    if (!token || !elSelectBackup) return;
    elSelectBackup.innerHTML = '<option value="">Carregando…</option>';
    fetch(apiBase + '?action=listBackups&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        elSelectBackup.innerHTML = '<option value="">— Escolha um backup —</option>';
        if (data && data.ok && data.backups && data.backups.length > 0) {
          data.backups.forEach(function (b) {
            var opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = (b.name || b.id) + (b.date ? ' (' + b.date.slice(0, 10) + ')' : '');
            elSelectBackup.appendChild(opt);
          });
        }
      })
      .catch(function () {
        elSelectBackup.innerHTML = '<option value="">Erro ao carregar</option>';
      });
  }

  function saveBackup() {
    var token = getToken();
    if (!token) return logout();
    if (elBtnSalvarBackup) {
      elBtnSalvarBackup.disabled = true;
      elBtnSalvarBackup.textContent = 'Salvando…';
    }
    showBackupMsg('');
    fetch(apiBase + '?action=saveBackup&token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (elBtnSalvarBackup) {
          elBtnSalvarBackup.disabled = false;
          elBtnSalvarBackup.textContent = 'Salvar backup';
        }
        if (data && data.ok) {
          showBackupMsg('Backup criado: ' + (data.name || '') + '. ' + (data.url ? 'Abre no Drive: ' + data.url : ''), false);
          loadBackups();
        } else {
          showBackupMsg((data && data.error) || 'Erro ao criar backup.', true);
        }
      })
      .catch(function () {
        if (elBtnSalvarBackup) {
          elBtnSalvarBackup.disabled = false;
          elBtnSalvarBackup.textContent = 'Salvar backup';
        }
        showBackupMsg('Erro de conexão.', true);
      });
  }

  function restoreBackup() {
    var token = getToken();
    if (!token) return logout();
    var backupId = elSelectBackup && elSelectBackup.value ? elSelectBackup.value.trim() : '';
    if (!backupId) {
      showBackupMsg('Escolha um backup na lista para restaurar.', true);
      return;
    }
    if (!confirm('Isso vai substituir as abas Items, Users e Orders pelos dados do backup. Os dados atuais serão perdidos. Continuar?')) {
      return;
    }
    if (elBtnRestaurarBackup) {
      elBtnRestaurarBackup.disabled = true;
      elBtnRestaurarBackup.textContent = 'Restaurando…';
    }
    showBackupMsg('');
    fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restoreBackup', token: token, backupId: backupId })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (elBtnRestaurarBackup) {
          elBtnRestaurarBackup.disabled = false;
          elBtnRestaurarBackup.textContent = 'Restaurar este backup';
        }
        if (data && data.ok) {
          showBackupMsg((data.message || 'Backup restaurado.') + ' Atualize a página para ver os dados.', false);
          loadItens();
          loadOrders();
        } else {
          showBackupMsg((data && data.error) || 'Erro ao restaurar.', true);
        }
      })
      .catch(function () {
        if (elBtnRestaurarBackup) {
          elBtnRestaurarBackup.disabled = false;
          elBtnRestaurarBackup.textContent = 'Restaurar este backup';
        }
        showBackupMsg('Erro de conexão.', true);
      });
  }

  function exportCsv() {
    if (currentOrders.length === 0) {
      showMsg('Nenhum pedido para exportar.', true);
      return;
    }
    var headers = ['orderId', 'timestamp', 'nome', 'email', 'telefone', 'bairro', 'observacoes', 'status', 'itens'];
    var rows = [headers.join(',')];
    currentOrders.forEach(function (o) {
      var itensStr = (o.itens || '').replace(/"/g, '""');
      var status = (o.status || 'ativo').toString().replace(/"/g, '""');
      rows.push([
        '"' + (o.orderId || '').replace(/"/g, '""') + '"',
        '"' + (o.timestamp || '').replace(/"/g, '""') + '"',
        '"' + (o.nome || '').replace(/"/g, '""') + '"',
        '"' + (o.email || '').replace(/"/g, '""') + '"',
        '"' + (o.telefone || '').replace(/"/g, '""') + '"',
        '"' + (o.bairro || '').replace(/"/g, '""') + '"',
        '"' + (o.observacoes || '').replace(/"/g, '""') + '"',
        '"' + status + '"',
        '"' + itensStr + '"'
      ].join(','));
    });
    var csv = rows.join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pedidos-compra-coletiva-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showMsg('CSV exportado.', false);
  }

  if (elBtnEntrar) elBtnEntrar.addEventListener('click', login);
  if (elBtnSair) elBtnSair.addEventListener('click', logout);
  if (elBtnSalvar) elBtnSalvar.addEventListener('click', saveItens);
  if (elBtnExportCsv) elBtnExportCsv.addEventListener('click', exportCsv);
  if (elBtnSalvarBackup) elBtnSalvarBackup.addEventListener('click', saveBackup);
  if (elBtnRestaurarBackup) elBtnRestaurarBackup.addEventListener('click', restoreBackup);

  checkAuth();
})();
