/**
 * Testes do tema (modo claro/escuro).
 * Executa o IIFE do theme.js em jsdom e verifica atributo e localStorage.
 */
const fs = require('fs');
const path = require('path');

describe('theme.js', () => {
  let originalLocalStorage;
  let mockStorage;

  beforeEach(() => {
    mockStorage = {};
    originalLocalStorage = global.localStorage;
    const storage = {
      getItem: (k) => mockStorage[k] || null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
      clear: () => { mockStorage = {}; },
      get length() { return Object.keys(mockStorage).length; },
      key: () => null,
    };
    global.localStorage = storage;
    if (typeof window !== 'undefined') window.localStorage = storage;
    document.body.innerHTML = '<button id="themeToggle"></button>';
    document.documentElement.removeAttribute('data-theme');
    if (global.matchMedia) {
      global.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      }));
    }
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  test('inicializa sem salvar no localStorage (respeita preferência do sistema)', () => {
    const script = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');
    eval(script);
    expect(mockStorage.florestavital_theme).toBeUndefined();
  });

  test('botão existe e recebe texto (lua ou sol)', () => {
    const btn = document.getElementById('themeToggle');
    const script = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');
    eval(script);
    expect(btn.textContent).toMatch(/^\u263E|\u2600$/);
  });

  test('ao clicar no botão alterna data-theme no document', () => {
    const script = fs.readFileSync(path.join(__dirname, '../theme.js'), 'utf8');
    eval(script);
    const btn = document.getElementById('themeToggle');
    const before = document.documentElement.getAttribute('data-theme');
    btn.click();
    const after = document.documentElement.getAttribute('data-theme');
    expect([null, 'dark', 'light']).toContain(after);
    expect(before !== after).toBe(true);
  });
});
