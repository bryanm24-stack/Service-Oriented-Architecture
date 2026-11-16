require('dotenv').config();

const mysql = require('mysql2/promise');

const demoWishes = [
  { name: '[DEMO] Laptop kerja', price: 12500000, payment_method: 'installment', down_payment: 2500000, tenor_months: 12 },
  { name: '[DEMO] Smartphone', price: 6500000, payment_method: 'installment', down_payment: 1000000, tenor_months: 10 },
  { name: '[DEMO] Sepeda lipat', price: 3800000, payment_method: 'cash', down_payment: 0, tenor_months: null },
  { name: '[DEMO] Kursi ergonomis', price: 2900000, payment_method: 'installment', down_payment: 400000, tenor_months: 6 },
  { name: '[DEMO] Monitor ultrawide', price: 5200000, payment_method: 'installment', down_payment: 1200000, tenor_months: 8 },
  { name: '[DEMO] Kamera mirrorless', price: 9800000, payment_method: 'installment', down_payment: 1800000, tenor_months: 12 },
  { name: '[DEMO] Headphone noise cancelling', price: 1850000, payment_method: 'cash', down_payment: 0, tenor_months: null },
  { name: '[DEMO] Meja kerja', price: 2400000, payment_method: 'cash', down_payment: 0, tenor_months: null },
  { name: '[DEMO] Tablet belajar', price: 4700000, payment_method: 'installment', down_payment: 700000, tenor_months: 8 },
  { name: '[DEMO] Liburan keluarga', price: 7500000, payment_method: 'installment', down_payment: 1500000, tenor_months: 6 },
  { name: '[DEMO] Mesin kopi', price: 3200000, payment_method: 'cash', down_payment: 0, tenor_months: null },
  { name: '[DEMO] Upgrade PC', price: 11200000, payment_method: 'installment', down_payment: 2200000, tenor_months: 12 },
];

const toCents = (value) => Math.round(value * 100);
const money = (cents) => (cents / 100).toFixed(2);

const addMonths = (date, months) => {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return result.toISOString().slice(0, 10);
};

const insertSchedules = async (connection, wishId, wish) => {
  if (wish.payment_method !== 'installment') return;

  const remainingCents = toCents(wish.price - wish.down_payment);
  const installmentCents = Math.floor(remainingCents / wish.tenor_months);
  const today = new Date();
  const schedules = Array.from({ length: wish.tenor_months }, (_, index) => {
    const amount = index === wish.tenor_months - 1
      ? remainingCents - installmentCents * (wish.tenor_months - 1)
      : installmentCents;
    return [
      wishId,
      index + 1,
      addMonths(today, index + 1),
      money(amount),
    ];
  });

  await connection.query(
    `INSERT INTO installment_schedules
      (wish_id, period_number, due_date, amount_snapshot, status)
     VALUES ?`,
    [schedules],
  );
};

const main = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed wishlist DEMO hanya untuk lingkungan pengembangan');
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asisten_keuangan',
  });

  let locked = false;
  let transactionStarted = false;
  try {
    const [[lock]] = await connection.execute("SELECT GET_LOCK('soa_seed_wishes_demo', 10) AS acquired");
    locked = Number(lock.acquired) === 1;
    if (!locked) throw new Error('Seed wishlist lain sedang berjalan');

    const [users] = await connection.execute(
      process.env.SEED_USER_EMAIL
        ? 'SELECT id, email FROM users WHERE email = ? AND deletedAt IS NULL LIMIT 1'
        : 'SELECT id, email FROM users WHERE deletedAt IS NULL ORDER BY id LIMIT 1',
      process.env.SEED_USER_EMAIL ? [process.env.SEED_USER_EMAIL] : [],
    );
    if (!users.length) {
      throw new Error('Tidak ada user aktif. Daftarkan akun terlebih dahulu atau isi SEED_USER_EMAIL.');
    }

    const user = users[0];
    await connection.beginTransaction();
    transactionStarted = true;
    let inserted = 0;
    for (const wish of demoWishes) {
      const [existing] = await connection.execute(
        'SELECT id_wish FROM wishes WHERE user_id = ? AND name = ? LIMIT 1',
        [user.id, wish.name],
      );
      if (existing.length) continue;

      const installmentAmount = wish.payment_method === 'installment'
        ? money(Math.floor(toCents(wish.price - wish.down_payment) / wish.tenor_months))
        : null;
      const [result] = await connection.execute(
        `INSERT INTO wishes
          (user_id, name, price, payment_method, down_payment, tenor_months, installment_amount, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')`,
        [
          user.id,
          wish.name,
          money(toCents(wish.price)),
          wish.payment_method,
          money(toCents(wish.down_payment)),
          wish.tenor_months,
          installmentAmount,
        ],
      );
      await insertSchedules(connection, result.insertId, wish);
      inserted += 1;
    }
    await connection.commit();
    transactionStarted = false;
    console.log(`[seed] ${inserted} wish DEMO ditambahkan untuk ${user.email}.`);
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    throw error;
  } finally {
    if (locked) await connection.execute("SELECT RELEASE_LOCK('soa_seed_wishes_demo')");
    await connection.end();
  }
};

if (require.main === module) {
  main().catch((error) => {
    console.error('[seed] Gagal:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { demoWishes, main };
