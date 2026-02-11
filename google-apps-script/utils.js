/**
 * Funções puras usadas pelo Code.gs (Apps Script).
 * Mantido em sincronia com Code.gs para permitir testes em Node.
 * Qualquer alteração aqui deve ser replicada em Code.gs (normalizePhone, phonesMatch).
 */

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

module.exports = { normalizePhone, phonesMatch };
