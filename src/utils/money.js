// Operasi nominal dalam satuan sen memakai BigInt agar DECIMAL tidak kehilangan presisi.
const toCents = value => {
    const text = String(value);

    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Format nominal tersimpan tidak valid');

    const [whole, fraction = ''] = text.split('.');

    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};

const fromCents = value => {
    const sign = value < 0n ? '-' : '';
    const absolute = value < 0n ? -value : value;

    return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
};

module.exports = { toCents, fromCents };
