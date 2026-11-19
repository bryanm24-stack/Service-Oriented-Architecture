const { MAX_TOKENS } = require('./tokenValues');

const estimateReservation = (completePrompt, maxOutputTokens, margin = 1.2) => {
  if (typeof completePrompt !== 'string' || !Number.isInteger(maxOutputTokens) || maxOutputTokens < 1 || !Number.isFinite(margin) || margin < 1 || margin > 2) {
    throw new TypeError('Parameter estimasi token tidak valid');
  }
  const estimatedInput = Math.ceil(Buffer.byteLength(completePrompt, 'utf8') / 3);
  const reserved = Math.ceil((estimatedInput + maxOutputTokens) * margin);
  if (reserved > MAX_TOKENS) throw new RangeError('Reservasi token melewati batas aman');
  return { estimatedInput, reserveTokens: reserved };
};

const actualBillableTokens = (inputTokens, outputTokens) => {
  for (const value of [inputTokens, outputTokens]) {
    if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TOKENS) throw new TypeError('Metadata token provider tidak valid');
  }
  const total = inputTokens + outputTokens;
  if (!Number.isSafeInteger(total) || total > MAX_TOKENS) throw new RangeError('Total token aktual melewati batas aman');
  return total;
};
module.exports = { estimateReservation, actualBillableTokens };
