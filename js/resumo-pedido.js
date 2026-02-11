/**
 * Resumo do pedido - página standalone (abre em nova aba).
 * Carrega pedido por orderId + telefone (localStorage), permite ajustar regiao/contrib, depois abre pagamento.
 */
(function () {
  var apiBase = typeof COMPRAS_COLETIVAS_API !== 'undefined' ? COMPRAS_COLETIVAS_API : '';
  var orderId = '';
  var telefone = '';
  var order = null;
  var catalogItems = [];
  var regioes = [];
  var orderConfig = { custoAdministrativoPercentual: 0, contribuicaoSugerida: [0, 2, 5] };
  var totals = { subtotalItens: 0, valorFrete: 0, custoAdminValor: 0, contribuicaoVoluntaria: 0, total: 0 };

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function getUrlParam(name) {
    var p = new URLSearchParams(window.location.search);
    return (p.get(name) || '').trim();
  }

  function showLoading(show) {
    var el = document.getElementById('rpLoading');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function showError(msg) {
    var el = document.getElementById('rpError');
    if (el) {
      el.textContent = msg || '';
      el.style.display = msg ? 'block' : 'none';
    }
  }

  function showContent(show) {
    var el = document.getElementById('rpContent');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function idToNome(id) {
    for (var i = 0; i < catalogItems.length; i++) {
      if (String(catalogItems[i].id || '') === String(id)) return catalogItems[i].nome || id;
    }
    return id;
  }

  function updateEntregaDisplay() {
    var retirada = document.getElementById('rpRetirada');
    var regiaoSel = document.getElementById('rpSelectRegiao');
    var freteEl = document.getElementById('rpFreteValor');
    var isRetirada = retirada && retirada.checked;
    if (regiaoSel) regiaoSel.style.display = isRetirada ? 'none' : 'block';
    if (regiaoSel && !isRetirada && regiaoSel.value) {
      var opt = regiaoSel.options[regiaoSel.selectedIndex];
      var f = parseFloat(opt && opt.getAttribute('data-frete')) || 0;
      totals.valorFrete = f;
      if (freteEl) freteEl.textContent = 'Frete: R$ ' + f.toFixed(2).replace('.', ',');
    } else {
      totals.valorFrete = 0;
      if (freteEl) freteEl.textContent = isRetirada ? 'Retirada: sem frete.' : 'Selecione a região.';
    }
    updateTotaisDisplay();
  }

  function updateTotaisDisplay() {
    var contribInput = document.getElementById('rpContribInput');
    var contribPct = parseFloat(contribInput && contribInput.value) || 0;
    totals.custoAdminValor = totals.subtotalItens * (orderConfig.custoAdministrativoPercentual || 0) / 100;
    totals.contribuicaoVoluntaria = totals.subtotalItens * contribPct / 100;
    totals.total = totals.subtotalItens + totals.valorFrete + totals.custoAdminValor + totals.contribuicaoVoluntaria;
    var el = document.getElementById('rpResumoTotais');
    if (el) {
      el.innerHTML =
        '<p><strong>Custo administrativo (' + (orderConfig.custoAdministrativoPercentual || 0) + '%):</strong> R$ ' + totals.custoAdminValor.toFixed(2).replace('.', ',') + '</p>' +
        '<p><strong>Contribuição voluntária:</strong> R$ ' + totals.contribuicaoVoluntaria.toFixed(2).replace('.', ',') + '</p>' +
        '<p style="font-size: 1.1rem;"><strong>Total: R$ ' + totals.total.toFixed(2).replace('.', ',') + '</strong></p>';
    }
  }

  function renderResumo() {
    if (!order || !order.itens) return;
    var itensObj = {};
    try { itensObj = typeof order.itens === 'string' ? JSON.parse(order.itens) : order.itens; } catch (e) {}
    var el = document.getElementById('rpResumoItens');
    if (!el) return;
    var subtotal = 0;
    var html = '<h3>Itens</h3><ul style="list-style:none; padding:0; margin:0;">';
    for (var id in itensObj) {
      if (!Object.prototype.hasOwnProperty.call(itensObj, id)) continue;
      var qty = parseInt(itensObj[id], 10) || 0;
      if (qty <= 0) continue;
      var item = catalogItems.filter(function (i) { return i.id === id; })[0];
      var preco = item ? (parseFloat(item.preco) || 0) : 0;
      var nome = item ? (item.nome || id) : id;
      var linha = preco * qty;
      subtotal += linha;
      html += '<li style="padding: var(--space-xs) 0;">' + esc(nome) + ' × ' + qty + ' — R$ ' + linha.toFixed(2).replace('.', ',') + '</li>';
    }
    html += '</ul><p style="margin-top: var(--space-sm); font-weight: 600;">Subtotal itens: R$ ' + subtotal.toFixed(2).replace('.', ',') + '</p>';
    el.innerHTML = html;
    totals.subtotalItens = subtotal;

    var regiaoSel = document.getElementById('rpSelectRegiao');
    if (regiaoSel) {
      regiaoSel.innerHTML = '<option value="">— Selecione a região —</option>';
      regioes.forEach(function (r) {
        var opt = document.createElement('option');
        opt.value = r.regiao;
        opt.setAttribute('data-frete', String(r.frete || 0));
        opt.textContent = r.regiao + ' — R$ ' + (parseFloat(r.frete) || 0).toFixed(2).replace('.', ',');
        regiaoSel.appendChild(opt);
      });
    }

    var retirada = document.getElementById('rpRetirada');
    if (retirada) retirada.checked = true;
    if (regiaoSel) regiaoSel.style.display = 'none';
    var freteEl = document.getElementById('rpFreteValor');
    if (freteEl) freteEl.textContent = 'Retirada: sem frete.';

    var sugestoes = document.getElementById('rpContribSugestoes');
    if (sugestoes) {
      sugestoes.innerHTML = '';
      (orderConfig.contribuicaoSugerida || [0, 2, 5]).forEach(function (pct) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-secondary btn-sm';
        btn.textContent = pct + '%';
        btn.addEventListener('click', function () {
          var inp = document.getElementById('rpContribInput');
          if (inp) inp.value = pct;
          updateTotaisDisplay();
        });
        sugestoes.appendChild(btn);
      });
    }

    var contribInput = document.getElementById('rpContribInput');
    if (contribInput) contribInput.value = 0;

    retirada.addEventListener('change', updateEntregaDisplay);
    document.getElementById('rpEntregaRegiao').addEventListener('change', updateEntregaDisplay);
    if (regiaoSel) regiaoSel.addEventListener('change', updateEntregaDisplay);
    if (contribInput) contribInput.addEventListener('input', updateTotaisDisplay);

    updateTotaisDisplay();
  }

  function goToPagamento() {
    var btn = document.getElementById('rpBtnIrPagamento');
    if (btn) { btn.disabled = true; btn.textContent = 'Atualizando…'; }

    var retirada = document.getElementById('rpRetirada');
    var regiaoSel = document.getElementById('rpSelectRegiao');
    var regiao = '';
    var valorFrete = 0;
    if (!(retirada && retirada.checked) && regiaoSel && regiaoSel.value) {
      regiao = regiaoSel.value;
      var opt = regiaoSel.options[regiaoSel.selectedIndex];
      valorFrete = parseFloat(opt && opt.getAttribute('data-frete')) || 0;
    }

    fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateOrderTotals',
        orderId: orderId,
        telefone: telefone,
        regiao: regiao,
        valorFrete: valorFrete,
        custoAdminValor: totals.custoAdminValor,
        contribuicaoVoluntaria: totals.contribuicaoVoluntaria,
        subtotalItens: totals.subtotalItens,
        total: totals.total
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (btn) { btn.disabled = false; btn.textContent = 'Ir para pagamento'; }
        if (data && data.ok) {
          window.open('pagamento.html?orderId=' + encodeURIComponent(orderId), '_blank');
        } else {
          showError((data && data.error) || 'Erro ao atualizar. Tente de novo.');
        }
      })
      .catch(function () {
        if (btn) { btn.disabled = false; btn.textContent = 'Ir para pagamento'; }
        showError('Erro de conexão. Tente de novo.');
      });
  }

  function init() {
    orderId = getUrlParam('orderId');
    try { telefone = localStorage.getItem('ccTelefone') || ''; } catch (e) {}
    telefone = (telefone || '').toString().replace(/\D/g, '');

    if (!orderId || telefone.length < 10) {
      showLoading(false);
      showError('Acesso inválido. Volte à Compra Coletiva e faça um pedido.');
      return;
    }

    var meta = document.getElementById('rpOrderMeta');
    if (meta) meta.textContent = 'Pedido ' + esc(orderId);

    Promise.all([
      fetch(apiBase + '?action=order&orderId=' + encodeURIComponent(orderId) + '&telefone=' + encodeURIComponent(telefone)).then(function (r) { return r.json(); }),
      fetch(apiBase + '?action=items').then(function (r) { return r.json(); }),
      fetch(apiBase + '?action=regioes').then(function (r) { return r.json(); }),
      fetch(apiBase + '?action=orderConfig').then(function (r) { return r.json(); })
    ])
      .then(function (results) {
        var orderData = results[0];
        var itemsData = results[1];
        var regioesData = results[2];
        var configData = results[3];

        showLoading(false);
        if (!orderData || !orderData.ok || !orderData.order) {
          showError((orderData && orderData.error) || 'Pedido não encontrado.');
          return;
        }
        order = orderData.order;

        catalogItems = (itemsData && itemsData.ok && itemsData.items) ? itemsData.items : [];
        regioes = (regioesData && regioesData.ok && regioesData.regioes) ? regioesData.regioes : [];
        if (configData && configData.ok) {
          orderConfig = {
            custoAdministrativoPercentual: configData.custoAdministrativoPercentual || 0,
            contribuicaoSugerida: configData.contribuicaoSugerida || [0, 2, 5]
          };
        }

        showContent(true);
        renderResumo();
      })
      .catch(function () {
        showLoading(false);
        showError('Erro ao carregar. Tente de novo.');
      });

    var btn = document.getElementById('rpBtnIrPagamento');
    if (btn) btn.addEventListener('click', goToPagamento);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
