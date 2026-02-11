/**
 * Compra Coletiva - Login por celular, perfil e pedido.
 * Mobile first. Identificação única por número de celular.
 */
(function () {
  var STORAGE_USER = 'cc_user';
  var STORAGE_VERIFIED = 'cc_verified';
  var apiBase = typeof COMPRAS_COLETIVAS_API !== 'undefined' ? COMPRAS_COLETIVAS_API : '';

  var stepPhone = document.getElementById('ccStepPhone');
  var stepProfile = document.getElementById('ccStepProfile');
  var stepVerify = document.getElementById('ccStepVerify');
  var stepOrder = document.getElementById('ccStepOrder');
  var formPhone = document.getElementById('formPhone');
  var formProfile = document.getElementById('formProfile');
  var formOrder = document.getElementById('formCompraColetiva');
  var msgPhone = document.getElementById('msgPhone');
  var msgProfile = document.getElementById('msgProfile');
  var msgVerify = document.getElementById('msgVerify');
  var msgCompra = document.getElementById('msgCompra');
  var containerItens = document.getElementById('itensCesta');
  var btnEnviar = document.getElementById('btnEnviarCompra');
  var ccSair = document.getElementById('ccSair');
  var catalogItems = [];
  var lastMeusPedidosOrders = [];
  var pendingOrder = null;
  var orderConfig = { custoAdministrativoPercentual: 0, contribuicaoSugerida: [0, 2, 5] };
  var regioes = [];
  var resumoTotals = { subtotalItens: 0, valorFrete: 0, custoAdminValor: 0, contribuicaoVoluntaria: 0, total: 0 };
  var resumoStepBound = false;

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function normalizePhone(t) {
    return (t || '').toString().replace(/\D/g, '');
  }

  function formatPhone(t) {
    var d = normalizePhone(t);
    if (d.length >= 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length >= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return d || t;
  }

  function getUser() {
    try {
      var s = sessionStorage.getItem(STORAGE_USER);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }

  function setUser(u) {
    if (u) sessionStorage.setItem(STORAGE_USER, JSON.stringify(u));
    else sessionStorage.removeItem(STORAGE_USER);
  }

  function getVerified() {
    return sessionStorage.getItem(STORAGE_VERIFIED) === '1';
  }
  function setVerified(ok) {
    if (ok) sessionStorage.setItem(STORAGE_VERIFIED, '1');
    else sessionStorage.removeItem(STORAGE_VERIFIED);
  }

  function showStep(step) {
    if (stepPhone) stepPhone.classList.remove('active');
    if (stepProfile) stepProfile.classList.remove('active');
    if (stepVerify) stepVerify.classList.remove('active');
    if (stepOrder) stepOrder.classList.remove('active');
    if (step === 'phone' && stepPhone) stepPhone.classList.add('active');
    if (step === 'profile' && stepProfile) stepProfile.classList.add('active');
    if (step === 'verify' && stepVerify) {
      stepVerify.classList.add('active');
      setupVerifyStep();
    }
    if (step === 'order' && stepOrder) {
      stepOrder.classList.add('active');
      fillOrderFromUser();
      if (containerItens) loadItens();
      loadMeusPedidos();
      loadRegioesAndConfig();
    }
  }

  function setupVerifyStep() {
    var u = getUser();
    var emailDisplay = document.getElementById('ccVerifyEmailDisplay');
    var emailInputWrap = document.getElementById('ccVerifyEmailInputWrap');
    var emailVerify = document.getElementById('emailVerify');
    var codeWrap = document.getElementById('ccVerifyCodeWrap');
    var codeVerify = document.getElementById('codeVerify');
    var btnVerificar = document.getElementById('ccBtnVerificar');
    if (emailDisplay) emailDisplay.innerHTML = '';
    if (emailInputWrap) emailInputWrap.style.display = 'none';
    if (codeWrap) codeWrap.style.display = 'none';
    if (btnVerificar) btnVerificar.style.display = 'none';
    if (codeVerify) codeVerify.value = '';
    if (msgVerify) msgVerify.textContent = '';
    if (u && u.email) {
      if (emailDisplay) emailDisplay.innerHTML = 'E-mail: <strong>' + esc((u.email || '').replace(/@.*/, '@***')) + '</strong>';
      if (emailVerify) emailVerify.value = u.email;
    } else {
      if (emailDisplay) emailDisplay.textContent = 'Informe o e-mail onde deseja receber o código.';
      if (emailInputWrap) emailInputWrap.style.display = 'block';
    }
  }

  function showMsg(el, text, isError) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'form-msg ' + (isError ? 'form-msg-error' : 'form-msg-success');
  }

  function fillOrderFromUser() {
    var u = getUser();
    if (!u) return;
    var nomeEl = document.getElementById('nome');
    var bairroEl = document.getElementById('bairro');
    if (nomeEl) nomeEl.value = u.nome || '';
    if (bairroEl) bairroEl.value = u.endereco || '';
    var phoneEl = document.getElementById('ccUserPhone');
    var nameEl = document.getElementById('ccUserName');
    if (phoneEl) phoneEl.textContent = formatPhone(u.telefone);
    if (nameEl) nameEl.textContent = u.nome || '';
  }

  function loadRegioesAndConfig() {
    fetch(apiBase + '?action=regioes')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok && data.regioes) regioes = data.regioes;
      })
      .catch(function () {});
    fetch(apiBase + '?action=orderConfig')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          orderConfig = {
            custoAdministrativoPercentual: data.custoAdministrativoPercentual || 0,
            contribuicaoSugerida: Array.isArray(data.contribuicaoSugerida) ? data.contribuicaoSugerida : [0, 2, 5]
          };
        }
      })
      .catch(function () {});
  }

  function setupResumoStep() {
    if (!pendingOrder || !pendingOrder.itens) return;
    var elItens = document.getElementById('ccResumoItens');
    var elRegiao = document.getElementById('ccSelectRegiao');
    var elFrete = document.getElementById('ccFreteValor');
    var elSugestoes = document.getElementById('ccContribSugestoes');
    var elContrib = document.getElementById('ccContribInput');
    var elTotais = document.getElementById('ccResumoTotais');
    if (!elItens) return;

    var subtotal = 0;
    var html = '<h3>Itens</h3><ul style="list-style:none; padding:0; margin:0;">';
    for (var id in pendingOrder.itens) {
      if (!Object.prototype.hasOwnProperty.call(pendingOrder.itens, id)) continue;
      var qty = parseInt(pendingOrder.itens[id], 10) || 0;
      if (qty <= 0) continue;
      var item = catalogItems.filter(function (i) { return i.id === id; })[0];
      var preco = item ? (parseFloat(item.preco) || 0) : 0;
      var nome = item ? (item.nome || id) : id;
      var linha = preco * qty;
      subtotal += linha;
      html += '<li style="padding: var(--space-xs) 0;">' + esc(nome) + ' × ' + qty + ' — R$ ' + linha.toFixed(2).replace('.', ',') + '</li>';
    }
    html += '</ul><p style="margin-top: var(--space-sm); font-weight: 600;">Subtotal itens: R$ ' + subtotal.toFixed(2).replace('.', ',') + '</p>';
    elItens.innerHTML = html;
    resumoTotals.subtotalItens = subtotal;

    if (elRegiao) {
      elRegiao.innerHTML = '<option value="">— Selecione a região —</option>';
      regioes.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.regiao;
        opt.setAttribute('data-frete', String(r.frete || 0));
        opt.textContent = r.regiao + ' — R$ ' + (parseFloat(r.frete) || 0).toFixed(2).replace('.', ',');
        elRegiao.appendChild(opt);
      });
    }

    var retirada = document.getElementById('ccRetirada');
    var entregaRegiao = document.getElementById('ccEntregaRegiao');
    if (retirada) retirada.checked = true;
    if (elRegiao) elRegiao.style.display = 'none';
    if (elFrete) elFrete.textContent = 'Retirada: sem frete.';

    function updateEntregaDisplay() {
      var isRetirada = retirada && retirada.checked;
      if (elRegiao) elRegiao.style.display = isRetirada ? 'none' : 'block';
      if (elRegiao && !isRetirada && elRegiao.value) {
        var opt = elRegiao.options[elRegiao.selectedIndex];
        var f = parseFloat(opt && opt.getAttribute('data-frete')) || 0;
        resumoTotals.valorFrete = f;
        if (elFrete) elFrete.textContent = 'Frete: R$ ' + f.toFixed(2).replace('.', ',');
      } else {
        resumoTotals.valorFrete = 0;
        if (elFrete) elFrete.textContent = isRetirada ? 'Retirada: sem frete.' : 'Selecione a região.';
      }
      updateResumoTotais();
    }
    function updateResumoTotais() {
      var contribPct = parseFloat(elContrib && elContrib.value) || 0;
      resumoTotals.custoAdminValor = resumoTotals.subtotalItens * (orderConfig.custoAdministrativoPercentual || 0) / 100;
      resumoTotals.contribuicaoVoluntaria = resumoTotals.subtotalItens * contribPct / 100;
      resumoTotals.total = resumoTotals.subtotalItens + resumoTotals.valorFrete + resumoTotals.custoAdminValor + resumoTotals.contribuicaoVoluntaria;
      if (elTotais) {
        elTotais.innerHTML =
          '<p><strong>Custo administrativo (' + (orderConfig.custoAdministrativoPercentual || 0) + '%):</strong> R$ ' + resumoTotals.custoAdminValor.toFixed(2).replace('.', ',') + '</p>' +
          '<p><strong>Contribuição voluntária:</strong> R$ ' + resumoTotals.contribuicaoVoluntaria.toFixed(2).replace('.', ',') + '</p>' +
          '<p style="font-size: 1.1rem;"><strong>Total: R$ ' + resumoTotals.total.toFixed(2).replace('.', ',') + '</strong></p>';
      }
    }
    if (!resumoStepBound) {
      resumoStepBound = true;
      if (retirada) retirada.addEventListener('change', updateEntregaDisplay);
      if (entregaRegiao) entregaRegiao.addEventListener('change', updateEntregaDisplay);
      if (elRegiao) elRegiao.addEventListener('change', updateEntregaDisplay);
      if (elContrib) elContrib.addEventListener('input', updateResumoTotais);
    }

    if (elSugestoes) {
      elSugestoes.innerHTML = '';
      (orderConfig.contribuicaoSugerida || [0, 2, 5]).forEach(function (pct) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-sm';
        btn.textContent = pct + '%';
        btn.addEventListener('click', function () {
          if (elContrib) elContrib.value = pct;
          updateResumoTotais();
        });
        elSugestoes.appendChild(btn);
      });
    }
    if (elContrib) elContrib.value = 0;
    updateResumoTotais();
  }

  function setupPagamentoStep() {
    var elTotal = document.getElementById('ccPagamentoTotal');
    if (elTotal) elTotal.textContent = 'Total do pedido: R$ ' + (resumoTotals.total || 0).toFixed(2).replace('.', ',');
  }

  function confirmarPedido() {
    var u = getUser();
    if (!u || !pendingOrder) return;
    var btn = document.getElementById('ccBtnConfirmarPedido');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }
    fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'order',
        nome: pendingOrder.nome,
        telefone: u.telefone,
        email: pendingOrder.email || '',
        bairro: pendingOrder.bairro || '',
        observacoes: pendingOrder.obs || '',
        itens: pendingOrder.itens,
        regiao: (document.getElementById('ccEntregaRegiao') && document.getElementById('ccEntregaRegiao').checked) ? (document.getElementById('ccSelectRegiao') && document.getElementById('ccSelectRegiao').value) || '' : '',
        retirada: !!(document.getElementById('ccRetirada') && document.getElementById('ccRetirada').checked),
        valorFrete: resumoTotals.valorFrete || 0,
        custoAdminValor: resumoTotals.custoAdminValor || 0,
        contribuicaoVoluntaria: resumoTotals.contribuicaoVoluntaria || 0,
        subtotalItens: resumoTotals.subtotalItens || 0,
        total: resumoTotals.total || 0
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
        if (data && data.ok) {
          showMsg(msgCompra, 'Pedido registrado! Nº ' + (data.orderId || '') + '. Entraremos em contato para pagamento.', false);
          if (formOrder) formOrder.reset();
          fillOrderFromUser();
          var inpList = containerItens && containerItens.querySelectorAll('input[type="number"]');
          if (inpList) for (var k = 0; k < inpList.length; k++) inpList[k].value = 0;
          pendingOrder = null;
          setCcTab('fazer');
          loadMeusPedidos();
        } else {
          showMsg(msgCompra, (data && data.error) || 'Erro ao enviar. Tente de novo.', true);
        }
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Confirmar pedido'; }
        showMsg(msgCompra, 'Erro de conexão. Tente de novo.', true);
      });
  }

  function isSafeImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    var u = url.trim();
    return u.indexOf('https://') === 0 || u.indexOf('http://') === 0;
  }

  function renderItens(items) {
    if (!containerItens) return;
    containerItens.innerHTML = '';
    if (!items || items.length === 0) {
      containerItens.innerHTML = '<p class="form-msg form-msg-error">Nenhum item disponível no momento.</p>';
      return;
    }
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'item-row form-group';
      var idAttr = 'item-' + (item.id || '').replace(/\s/g, '-');
      var maxQty = Math.max(0, parseInt(item.estoque, 10) || 0);
      var imgWrap = '';
      if (item.imagem && isSafeImageUrl(item.imagem)) {
        var altText = esc(item.nome || '');
        imgWrap = '<div class="item-img-wrap"><img class="item-img" src="' + esc(item.imagem) + '" alt="' + altText + '" loading="lazy" width="56" height="56" onerror="this.onerror=null;this.style.display=\'none\';if(this.parentElement)this.parentElement.style.display=\'none\';"></div>';
      }
      row.innerHTML =
        imgWrap +
        '<label for="' + idAttr + '">' + esc(item.nome) + ' <span class="unidade">(' + esc(item.unidade || 'un') + ')</span></label>' +
        '<input type="number" id="' + idAttr + '" name="' + esc(item.id) + '" min="0" max="' + maxQty + '" value="0" data-max="' + maxQty + '" placeholder="0" aria-label="Quantidade ' + esc(item.nome) + '">';
      containerItens.appendChild(row);
    });
  }

  function loadItens() {
    var url = apiBase + '?action=items';
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        catalogItems = (data && data.ok && data.items) ? data.items : [];
        if (data && data.ok && data.items) renderItens(data.items);
        else renderItens([]);
        if (stepOrder && stepOrder.classList.contains('active')) loadMeusPedidos();
      })
      .catch(function () { renderItens([]); });
  }

  function idToNome(id) {
    for (var i = 0; i < catalogItems.length; i++) {
      if (String(catalogItems[i].id || '') === String(id)) return catalogItems[i].nome || id;
    }
    return id;
  }

  function formatPedidoItens(itensStr) {
    try {
      var itens = typeof itensStr === 'string' ? JSON.parse(itensStr) : itensStr;
      var parts = [];
      for (var id in itens) {
        if (itens.hasOwnProperty(id) && parseInt(itens[id], 10) > 0) {
          parts.push(itens[id] + 'x ' + idToNome(id));
        }
      }
      return parts.length ? parts.join(', ') : '—';
    } catch (e) { return '—'; }
  }

  function formatPedidoDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function renderMeusPedidos(orders) {
    var listEl = document.getElementById('ccMeusPedidosLista');
    var msgEl = document.getElementById('ccMeusPedidosMsg');
    if (!listEl) return;
    if (!orders || orders.length === 0) {
      msgEl.textContent = 'Você ainda não fez nenhum pedido.';
      listEl.innerHTML = '';
      lastMeusPedidosOrders = [];
      return;
    }
    msgEl.textContent = '';
    listEl.innerHTML = '';
    lastMeusPedidosOrders = orders;
    orders.forEach(function (order) {
      var li = document.createElement('li');
      var status = (order.status || '').toLowerCase();
      var isCancelado = status === 'cancelado';
      var isSeparado = status === 'separado';
      var isEntregue = status === 'entregue';
      var statusLabel = isCancelado ? 'Cancelado' : (isSeparado ? 'Separado' : (isEntregue ? 'Entregue' : ''));
      if (isCancelado) li.classList.add('cancelado');
      if (isSeparado) li.classList.add('separado');
      if (isEntregue) li.classList.add('entregue');
      var showActions = !isCancelado && !isSeparado && !isEntregue;
      li.innerHTML =
        '<div class="pedido-meta">' + esc(order.orderId) + ' · ' + esc(formatPedidoDate(order.timestamp)) + (statusLabel ? ' · <strong>' + esc(statusLabel) + '</strong>' : '') + '</div>' +
        '<div class="pedido-itens">' + esc(formatPedidoItens(order.itens)) + '</div>' +
        (showActions ? '<div class="pedido-acoes"><button type="button" class="btn btn-secondary cc-btn-cancelar-pedido" data-order-id="' + esc(order.orderId) + '">Cancelar pedido</button><button type="button" class="btn btn-primary cc-btn-editar-pedido" data-order-index="' + esc(String(lastMeusPedidosOrders.indexOf(order))) + '">Editar</button></div>' : '');
      listEl.appendChild(li);
    });
    listEl.querySelectorAll('.cc-btn-cancelar-pedido').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var orderId = this.getAttribute('data-order-id');
        if (!orderId) return;
        if (!confirm('Tem certeza que deseja cancelar este pedido? O estoque será devolvido.')) return;
        var u = getUser();
        if (!u || !u.telefone) return;
        btn.disabled = true;
        fetch(apiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancelOrder', orderId: orderId, telefone: u.telefone })
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.ok) {
              loadMeusPedidos();
              if (msgCompra) showMsg(msgCompra, 'Pedido cancelado.', false);
            } else {
              if (msgCompra) showMsg(msgCompra, (data && data.error) || 'Erro ao cancelar.', true);
            }
          })
          .catch(function () {
            if (msgCompra) showMsg(msgCompra, 'Erro de conexão. Tente de novo.', true);
          })
          .then(function () { btn.disabled = false; });
      });
    });
    listEl.querySelectorAll('.cc-btn-editar-pedido').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.getAttribute('data-order-index'), 10);
        var order = lastMeusPedidosOrders[idx];
        if (!order) return;
        openModalEditar(order.orderId, order.bairro || '', order.observacoes || '', order.itens || '{}');
      });
    });
  }

  function loadMeusPedidos() {
    var msgEl = document.getElementById('ccMeusPedidosMsg');
    var listEl = document.getElementById('ccMeusPedidosLista');
    if (msgEl) msgEl.textContent = 'Carregando…';
    if (listEl) listEl.innerHTML = '';
    var u = getUser();
    if (!u || !u.telefone) {
      if (msgEl) msgEl.textContent = 'Faça login para ver seus pedidos.';
      return;
    }
    fetch(apiBase + '?action=myOrders&telefone=' + encodeURIComponent(normalizePhone(u.telefone)))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.orders) renderMeusPedidos(data.orders);
        else renderMeusPedidos([]);
      })
      .catch(function () {
        if (msgEl) msgEl.textContent = 'Erro ao carregar pedidos. Tente de novo.';
        renderMeusPedidos([]);
      });
  }

  function openModalEditar(orderId, bairro, obs, itensStr) {
    var modal = document.getElementById('ccModalEditar');
    var titleOrderId = document.getElementById('ccModalEditarOrderId');
    var editBairro = document.getElementById('editBairro');
    var editObs = document.getElementById('editObs');
    var container = document.getElementById('ccEditItensContainer');
    var formEdit = document.getElementById('formEditarPedido');
    var msgEdit = document.getElementById('msgEditPedido');
    if (!modal || !formEdit) return;
    if (titleOrderId) titleOrderId.textContent = 'Pedido ' + orderId;
    if (editBairro) editBairro.value = bairro || '';
    if (editObs) editObs.value = obs || '';
    var itensObj;
    try { itensObj = typeof itensStr === 'string' ? JSON.parse(itensStr) : itensStr; } catch (e) { itensObj = {}; }
    container.innerHTML = '';
    catalogItems.forEach(function (item) {
      var qty = parseInt(itensObj[item.id], 10) || 0;
      var maxQty = Math.max(0, parseInt(item.estoque, 10) || 0) + qty;
      var row = document.createElement('div');
      row.className = 'item-row form-group';
      var idAttr = 'edit-item-' + (item.id || '').replace(/\s/g, '-');
      row.innerHTML =
        '<label for="' + idAttr + '">' + esc(item.nome) + ' <span class="unidade">(' + esc(item.unidade || 'un') + ')</span></label>' +
        '<input type="number" id="' + idAttr + '" name="' + esc(item.id) + '" min="0" max="' + maxQty + '" value="' + qty + '" data-max="' + maxQty + '" placeholder="0" aria-label="Quantidade ' + esc(item.nome) + '">';
      container.appendChild(row);
    });
    formEdit.setAttribute('data-edit-order-id', orderId);
    if (msgEdit) msgEdit.textContent = '';
    modal.removeAttribute('hidden');
  }

  function closeModalEditar() {
    var modal = document.getElementById('ccModalEditar');
    if (modal) modal.setAttribute('hidden', '');
  }

  // —— Modal editar pedido: submit, fechar, backdrop ——
  var formEditarPedido = document.getElementById('formEditarPedido');
  var btnModalFechar = document.getElementById('ccModalEditarFechar');
  var modalBackdrop = document.getElementById('ccModalEditarBackdrop');
  if (formEditarPedido) {
    formEditarPedido.addEventListener('submit', function (e) {
      e.preventDefault();
      var orderId = formEditarPedido.getAttribute('data-edit-order-id');
      var u = getUser();
      if (!orderId || !u || !u.telefone) { closeModalEditar(); return; }
      var editBairro = document.getElementById('editBairro');
      var editObs = document.getElementById('editObs');
      var container = document.getElementById('ccEditItensContainer');
      var msgEdit = document.getElementById('msgEditPedido');
      var itens = {};
      if (container) {
        container.querySelectorAll('input[type="number"]').forEach(function (inp) {
          var qty = parseInt(inp.value, 10) || 0;
          if (inp.name && qty > 0) itens[inp.name] = qty;
        });
      }
      var bairro = (editBairro && editBairro.value) ? editBairro.value.trim() : '';
      var obs = (editObs && editObs.value) ? editObs.value.trim() : '';
      if (Object.keys(itens).length === 0) {
        showMsg(msgEdit, 'Selecione pelo menos um item com quantidade maior que zero.', true);
        return;
      }
      var btnSalvar = document.getElementById('btnSalvarEdicao');
      if (btnSalvar) btnSalvar.disabled = true;
      fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateOrder',
          orderId: orderId,
          telefone: u.telefone,
          itens: itens,
          bairro: bairro,
          observacoes: obs
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (btnSalvar) btnSalvar.disabled = false;
          if (data && data.ok) {
            closeModalEditar();
            loadMeusPedidos();
            if (msgCompra) showMsg(msgCompra, 'Pedido atualizado.', false);
          } else {
            showMsg(msgEdit, (data && data.error) || 'Erro ao salvar. Tente de novo.', true);
          }
        })
        .catch(function () {
          if (btnSalvar) btnSalvar.disabled = false;
          showMsg(msgEdit, 'Erro de conexão. Tente de novo.', true);
        });
    });
  }
  if (btnModalFechar) btnModalFechar.addEventListener('click', closeModalEditar);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModalEditar);

  // —— Login por celular ——
  if (formPhone) {
    formPhone.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msgPhone, '');
      var raw = (document.getElementById('telefoneLogin') && document.getElementById('telefoneLogin').value || '').trim();
      var tel = normalizePhone(raw);
      if (tel.length < 10) {
        showMsg(msgPhone, 'Digite um número válido com DDD.', true);
        return;
      }
      fetch(apiBase + '?action=user&telefone=' + encodeURIComponent(tel))
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok && data.exists && data.user) {
            setUser({ telefone: data.user.telefone || tel, nome: data.user.nome, endereco: data.user.endereco, documento: data.user.documento, email: data.user.email });
            if (getVerified()) showStep('order');
            else showStep('verify');
          } else {
            setUser({ telefone: tel, nome: '', endereco: '', documento: '' });
            showStep('profile');
            var ph = document.getElementById('ccProfilePhone');
            if (ph) ph.textContent = 'Celular: ' + formatPhone(tel);
            var inp = document.getElementById('nomePerfil');
            if (inp) inp.focus();
          }
        })
        .catch(function () {
          showMsg(msgPhone, 'Erro de conexão. Tente de novo.', true);
        });
    });
  }

  // —— Perfil (novo usuário) ——
  if (formProfile) {
    formProfile.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msgProfile, '');
      var u = getUser();
      if (!u || !u.telefone) { showStep('phone'); return; }
      var nome = (document.getElementById('nomePerfil') && document.getElementById('nomePerfil').value || '').trim();
      if (!nome) {
        showMsg(msgProfile, 'Preencha seu nome.', true);
        return;
      }
      var endereco = (document.getElementById('enderecoPerfil') && document.getElementById('enderecoPerfil').value || '').trim();
      var documento = (document.getElementById('documentoPerfil') && document.getElementById('documentoPerfil').value || '').trim();
      var email = (document.getElementById('emailPerfil') && document.getElementById('emailPerfil').value || '').trim();
      if (!email) {
        showMsg(msgProfile, 'Preencha o e-mail para receber o código de verificação.', true);
        return;
      }
      fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          telefone: u.telefone,
          nome: nome,
          endereco: endereco,
          documento: documento,
          email: email
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && data.ok && data.user) {
            setUser(data.user);
            showStep('verify');
          } else {
            showMsg(msgProfile, (data && data.error) || 'Erro ao salvar. Tente de novo.', true);
          }
        })
        .catch(function () {
          showMsg(msgProfile, 'Erro de conexão. Tente de novo.', true);
        });
    });
  }

  // —— Verificação por código no e-mail ——
  var ccBtnEnviarCodigo = document.getElementById('ccBtnEnviarCodigo');
  var ccBtnVerificar = document.getElementById('ccBtnVerificar');
  var codeVerify = document.getElementById('codeVerify');
  var emailVerify = document.getElementById('emailVerify');
  if (ccBtnEnviarCodigo) {
    ccBtnEnviarCodigo.addEventListener('click', function () {
      showMsg(msgVerify, '');
      var u = getUser();
      if (!u || !u.telefone) { showStep('phone'); return; }
      var email = (emailVerify && emailVerify.value || '').trim() || (u && u.email) || '';
      if (!email || email.indexOf('@') === -1) {
        showMsg(msgVerify, 'Informe um e-mail válido.', true);
        return;
      }
      ccBtnEnviarCodigo.disabled = true;
      ccBtnEnviarCodigo.textContent = 'Enviando…';
      fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sendCode', telefone: u.telefone, email: email })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          ccBtnEnviarCodigo.disabled = false;
          ccBtnEnviarCodigo.textContent = 'Enviar código por e-mail';
          if (data && data.ok) {
            showMsg(msgVerify, 'Código enviado! Confira seu e-mail e digite abaixo.', false);
            var cw = document.getElementById('ccVerifyCodeWrap');
            var bv = document.getElementById('ccBtnVerificar');
            if (cw) cw.style.display = 'block';
            if (bv) bv.style.display = 'block';
            if (codeVerify) { codeVerify.value = ''; codeVerify.focus(); }
          } else {
            showMsg(msgVerify, (data && data.error) || 'Erro ao enviar. Tente de novo.', true);
          }
        })
        .catch(function () {
          ccBtnEnviarCodigo.disabled = false;
          ccBtnEnviarCodigo.textContent = 'Enviar código por e-mail';
          showMsg(msgVerify, 'Erro de conexão. Tente de novo.', true);
        });
    });
  }
  if (ccBtnVerificar && codeVerify) {
    ccBtnVerificar.addEventListener('click', function () {
      showMsg(msgVerify, '');
      var u = getUser();
      if (!u || !u.telefone) { showStep('phone'); return; }
      var code = (codeVerify.value || '').trim();
      if (code.length !== 6) {
        showMsg(msgVerify, 'Digite o código de 6 dígitos.', true);
        return;
      }
      ccBtnVerificar.disabled = true;
      fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verifyCode', telefone: u.telefone, code: code })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          ccBtnVerificar.disabled = false;
          if (data && data.ok) {
            setVerified(true);
            showStep('order');
          } else {
            showMsg(msgVerify, (data && data.error) || 'Código inválido ou expirado.', true);
          }
        })
        .catch(function () {
          ccBtnVerificar.disabled = false;
          showMsg(msgVerify, 'Erro de conexão. Tente de novo.', true);
        });
    });
  }

  // —— Pedido: Ver resumo → Resumo → Pagamento → Confirmar ——
  if (formOrder) {
    formOrder.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msgCompra, '');
      var u = getUser();
      if (!u || !u.telefone) { setUser(null); showStep('phone'); return; }
      if (!getVerified()) { showStep('verify'); return; }
      var nome = (document.getElementById('nome') && document.getElementById('nome').value || '').trim();
      var bairro = (document.getElementById('bairro') && document.getElementById('bairro').value || '').trim();
      var email = (document.getElementById('email') && document.getElementById('email').value || '').trim();
      var obs = (document.getElementById('obs') && document.getElementById('obs').value || '').trim();
      var itens = {};
      var inputs = containerItens && containerItens.querySelectorAll('input[type="number"]');
      if (inputs) {
        for (var i = 0; i < inputs.length; i++) {
          var qty = parseInt(inputs[i].value, 10) || 0;
          if (qty > 0 && inputs[i].name) itens[inputs[i].name] = qty;
        }
      }
      if (Object.keys(itens).length === 0) {
        showMsg(msgCompra, 'Selecione pelo menos um item com quantidade maior que zero.', true);
        return;
      }
      var inpList = containerItens && containerItens.querySelectorAll('input[type="number"]');
      if (inpList) {
        for (var j = 0; j < inpList.length; j++) {
          var q = parseInt(inpList[j].value, 10) || 0;
          if (q > 0) {
            var max = parseInt(inpList[j].getAttribute('data-max'), 10) || 0;
            if (q > max) {
              showMsg(msgCompra, 'A quantidade de um item não pode ser maior que o estoque (' + max + ').', true);
              return;
            }
          }
        }
      }
      pendingOrder = { nome: nome, bairro: bairro, email: email, obs: obs, itens: itens };
      setCcTab('resumo');
    });
  }

  var ccBtnVoltarCesta = document.getElementById('ccBtnVoltarCesta');
  var ccBtnIrPagamento = document.getElementById('ccBtnIrPagamento');
  var ccBtnVoltarResumo = document.getElementById('ccBtnVoltarResumo');
  var ccBtnConfirmarPedido = document.getElementById('ccBtnConfirmarPedido');
  if (ccBtnVoltarCesta) ccBtnVoltarCesta.addEventListener('click', function () { setCcTab('fazer'); });
  if (ccBtnIrPagamento) ccBtnIrPagamento.addEventListener('click', function () { setCcTab('pagamento'); });
  if (ccBtnVoltarResumo) ccBtnVoltarResumo.addEventListener('click', function () { setCcTab('resumo'); });
  if (ccBtnConfirmarPedido) ccBtnConfirmarPedido.addEventListener('click', confirmarPedido);

  // —— Sair ——
  if (ccSair) {
    ccSair.addEventListener('click', function (e) {
      e.preventDefault();
      setUser(null);
      setVerified(false);
      showStep('phone');
      if (formPhone) formPhone.reset();
      showMsg(msgPhone, '');
    });
  }

  // —— Abas Fazer pedido | Meus pedidos | Resumo | Pagamento ——
  function setCcTab(panel) {
    ['ccTabFazer', 'ccTabMeus', 'ccTabResumo', 'ccTabPagamento'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        var key = id.replace('ccTab', '').toLowerCase();
        el.classList.toggle('active', key === panel);
      }
    });
    document.querySelectorAll('.cc-tabs .cc-tab').forEach(function (t) {
      var isActive = (t.getAttribute('data-cc-tab') || '') === panel;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (panel === 'resumo') {
      if (pendingOrder) {
        setupResumoStep();
      } else {
        var elItens = document.getElementById('ccResumoItens');
        if (elItens) elItens.innerHTML = '<p class="form-msg" style="margin: 0;">Preencha a cesta na aba Fazer pedido e clique em <strong>Ver resumo do pedido</strong>.</p>';
      }
    }
    if (panel === 'pagamento') {
      if (pendingOrder) {
        setupPagamentoStep();
      } else {
        var elTot = document.getElementById('ccPagamentoTotal');
        if (elTot) elTot.textContent = 'Preencha a cesta e vá ao resumo primeiro.';
      }
    }
  }
  document.querySelectorAll('.cc-tabs .cc-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      setCcTab(tab.getAttribute('data-cc-tab') || 'fazer');
    });
  });

  // Início: já logado e verificado?
  var u = getUser();
  if (u && u.telefone && u.nome && getVerified()) {
    showStep('order');
  } else if (u && u.telefone && u.nome) {
    showStep('verify');
  } else if (u && u.telefone && !u.nome) {
    showStep('profile');
  } else {
    setUser(null);
    setVerified(false);
    showStep('phone');
  }
})();
