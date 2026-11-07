require('dotenv').config();
const { sequelize } = require('../src/models');
const demo = [
  { name: 'DEMO Hemat', token_quota: 1000, price_idr: '15000.00', is_active: true },
  { name: 'DEMO Rutin', token_quota: 5000, price_idr: '65000.00', is_active: true },
  { name: 'DEMO Ekstra', token_quota: 12000, price_idr: '140000.00', is_active: true },
];
const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed harga DEMO hanya untuk lingkungan pengembangan');
  }
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asisten_keuangan',
  });
  let locked = false;
  try {
    const [[lock]] = await connection.execute("SELECT GET_LOCK('soa_seed_token_demo', 10) AS acquired");
    locked = Number(lock.acquired) === 1;
    if (!locked) throw new Error('Seed lain sedang berjalan');
    await connection.beginTransaction();
    for (const values of demo) {
      const [existing] = await connection.execute('SELECT id FROM token_bundles WHERE name=? LIMIT 1', [values.name]);
      if (!existing.length) {
        await connection.execute('INSERT INTO token_bundles(name,token_quota,price_idr,is_active) VALUES(?,?,?,?)',
          [values.name, values.token_quota, values.price_idr, values.is_active]);
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    if (locked) await connection.execute("SELECT RELEASE_LOCK('soa_seed_token_demo')");
    await connection.end();
  }
  console.log('[seed] Paket DEMO tersedia. Harga contoh, bukan penawaran komersial.');
};
if (require.main === module) {
  main().catch((error) => {
    console.error('[seed] Gagal:', error.message);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}
module.exports = { main, demo };
