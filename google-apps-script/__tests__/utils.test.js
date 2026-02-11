/**
 * Testes das funções puras do Apps Script (normalizePhone, phonesMatch).
 * A lógica está em utils.js; Code.gs deve manter as mesmas funções em sincronia.
 */
const { normalizePhone, phonesMatch } = require('../utils.js');

describe('normalizePhone', () => {
  test('retorna só dígitos', () => {
    expect(normalizePhone('(11) 99999-9999')).toBe('11999999999');
    expect(normalizePhone('11 99999 9999')).toBe('11999999999');
    expect(normalizePhone('5511999999999')).toBe('5511999999999');
  });

  test('aceita null e undefined', () => {
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone(undefined)).toBe('');
  });

  test('aceita número', () => {
    expect(normalizePhone(11999999999)).toBe('11999999999');
  });

  test('remove tudo que não é dígito', () => {
    expect(normalizePhone('+55 (11) 9 9999-9999')).toBe('5511999999999');
    expect(normalizePhone('abc123def456')).toBe('123456');
  });
});

describe('phonesMatch', () => {
  test('iguais quando normalizados iguais', () => {
    expect(phonesMatch('11999999999', '11999999999')).toBe(true);
  });

  test('compatíveis quando um é sufixo do outro (DDI)', () => {
    expect(phonesMatch('11999999999', '5511999999999')).toBe(true);
    expect(phonesMatch('5511999999999', '11999999999')).toBe(true);
  });

  test('diferentes quando números diferentes', () => {
    expect(phonesMatch('11999999999', '11888888888')).toBe(false);
    expect(phonesMatch('11999999999', '21999999999')).toBe(false);
  });

  test('false quando um é vazio', () => {
    expect(phonesMatch('', '11999999999')).toBe(false);
    expect(phonesMatch('11999999999', '')).toBe(false);
    expect(phonesMatch(null, '11999999999')).toBe(false);
  });
});
