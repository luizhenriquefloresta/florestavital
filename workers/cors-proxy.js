/**
 * Proxy CORS para o Google Apps Script (Compra Coletiva).
 * O Apps Script não envia cabeçalhos CORS; este worker encaminha as requisições
 * e adiciona Access-Control-Allow-Origin na resposta.
 *
 * Deploy no Cloudflare Workers (grátis):
 * 1. Crie conta em workers.cloudflare.com
 * 2. Crie um Worker e cole este código
 * 3. Em Settings → Variables, adicione: SCRIPT_URL = sua URL do Web App (ex.: https://script.google.com/macros/s/.../exec)
 * 4. Use a URL do worker em js/config.js (ex.: https://seu-worker.seu-subdominio.workers.dev)
 */

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
}

export default {
  async fetch(request, env) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
      }

      const scriptUrl = env.SCRIPT_URL;
      if (!scriptUrl || typeof scriptUrl !== 'string') {
        const h = corsHeaders();
        h.set('Content-Type', 'application/json');
        return new Response(JSON.stringify({ ok: false, error: 'SCRIPT_URL not configured in Worker' }), {
          status: 500,
          headers: h,
        });
      }

      const url = new URL(request.url);
      const base = scriptUrl.replace(/\/$/, '');
      let queryString = url.search && url.search.length > 1 ? url.search.slice(1) : '';
      const pathAction = url.pathname.replace(/^\/+/, '').toLowerCase();
      if (pathAction === 'listbackups' || pathAction === 'savebackup') {
        const params = new URLSearchParams(queryString);
        params.set('action', pathAction === 'listbackups' ? 'listBackups' : 'saveBackup');
        queryString = params.toString();
      }
      const targetUrl = queryString
        ? (base.includes('?') ? base + '&' + queryString : base + '?' + queryString)
        : base;

      const init = {
        method: request.method,
        headers: {},
      };
      if (request.method === 'POST' && request.body) {
        init.body = await request.arrayBuffer();
        const ct = request.headers.get('Content-Type');
        if (ct) init.headers['Content-Type'] = ct;
      }

      const response = await fetch(targetUrl, init);
      const newHeaders = corsHeaders();
      response.headers.forEach((v, k) => newHeaders.set(k, v));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (e) {
      const h = corsHeaders();
      h.set('Content-Type', 'application/json');
      return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), {
        status: 500,
        headers: h,
      });
    }
  },
};
