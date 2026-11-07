const MAX_TOKENS = 2147483647;
const { toCents, fromCents } = require('./money');

const normalizeName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

// DECIMAL(15,2) travels over JSON as a string, never a JavaScript float.
const isPrice = (value) =>
  typeof value === 'string' &&
  /^\d{1,13}(?:\.\d{1,2})?$/.test(value) &&
  toCents(value) > 0n;

const decimalPrice = (value) => {
  if (!isPrice(value)) throw new Error('Harga IDR harus positif, maksimal dua desimal');
  return fromCents(toCents(value));
};

module.exports = { MAX_TOKENS, normalizeName, isPrice, decimalPrice };
