const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const derive = promisify(scrypt);
const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt, 64)).toString('hex')}`;
};
const verifyPassword = async (password, stored) => {
  if (typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (
    parts.length !== 3 ||
    parts[0] !== 'scrypt' ||
    !/^[a-f0-9]{32}$/i.test(parts[1]) ||
    !/^[a-f0-9]{128}$/i.test(parts[2])
  )
    return false;
  const actual = await derive(password, parts[1], 64);
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
};
module.exports = { hashPassword, verifyPassword };
