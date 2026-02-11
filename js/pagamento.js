/**
 * Pagamento - página standalone (abre em nova aba).
 * Carrega pedido por orderId + telefone (localStorage) e exibe total e instruções.
 */
(function () {
  var apiBase = typeof COMPRAS_COLETIVAS_API !== 'undefined' ? COMPRAS_COLETIVAS_API : '';
  var orderId = '';
  var telefone = '';

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
    var el = document.getElementById('pgLoading');
    if (el) el.style.display = show ? 'block' : 'none';
  }

  function showError(msg) {
    var el = document.getElementById('pgError');
    if (el) {
      el.textContent = msg || '';
      el.style.display = msg ? 'block' : 'none';
    }
  }

  function showContent(show) {
    var el = document.getElementById('pgContent');
    if (el) el.style.display = show ? 'block' : 'none';
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

    fetch(apiBase + '?action=order&orderId=' + encodeURIComponent(orderId) + '&telefone=' + encodeURIComponent(telefone))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        showLoading(false);
        if (!data || !data.ok || !data.order) {
          showError((data && data.error) || 'Pedido não encontrado.');
          return;
        }
        var order = data.order;
        showContent(true);

        var idEl = document.getElementById('pgOrderId');
        if (idEl) idEl.textContent = 'Pedido ' + esc(order.orderId);

        var totalEl = document.getElementById('pgTotal');
        if (totalEl) {
          var total = parseFloat(order.total) || 0;
          totalEl.textContent = 'Total do pedido: R$ ' + total.toFixed(2).replace('.', ',');
        }
      })
      .catch(function () {
        showLoading(false);
        showError('Erro ao carregar. Tente de novo.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
