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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const scriptUrl = env.SCRIPT_URL;
    if (!scriptUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'SCRIPT_URL not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const url = new URL(request.url);
    const targetUrl = scriptUrl + (url.search || '');

    const init = {
      method: request.method,
      headers: {},
    };
    if (request.method === 'POST' && request.body) {
      init.body = request.body;
      const ct = request.headers.get('Content-Type');
      if (ct) init.headers['Content-Type'] = ct;
    }

    const response = await fetch(targetUrl, init);
    const newHeaders = new Headers(response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
