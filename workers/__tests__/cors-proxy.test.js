/**
 * Testes de fumaça do Worker CORS (estrutura e contrato).
 * O Worker roda no Cloudflare; aqui validamos o formato do código.
 */
const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '../cors-proxy.js');
const source = fs.readFileSync(workerPath, 'utf8');

describe('cors-proxy.js', () => {
  test('arquivo existe e contém handler fetch', () => {
    expect(source).toMatch(/async\s+fetch\s*\(/);
  });

  test('usa SCRIPT_URL do env', () => {
    expect(source).toMatch(/env\.SCRIPT_URL/);
  });

  test('retorna cabeçalhos CORS', () => {
    expect(source).toMatch(/Access-Control-Allow-Origin/);
    expect(source).toMatch(/Access-Control-Allow-Methods/);
  });

  test('trata OPTIONS (preflight)', () => {
    expect(source).toMatch(/OPTIONS/);
  });

  test('export default presente (formato ES module para Cloudflare)', () => {
    expect(source).toMatch(/export\s+default/);
  });
});
