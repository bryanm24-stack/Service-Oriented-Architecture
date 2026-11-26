#!/usr/bin/env node
'use strict';

/*
 * DATA DUMMY SOA - cocok untuk Service-Oriented-Architecture(5).zip
 *
 * Simpan file ini di folder utama proyek, sejajar dengan js/ dan laravel/.
 * Pastikan MySQL aktif, npm install sudah dilakukan di js/, dan migrasi
 * proyek sudah dijalankan. Skrip ini hanya INSERT data, bukan migrasi.
 *
 * Jalankan:       node seed-dummy-soa.cjs
 * Akun sendiri:   node seed-dummy-soa.cjs --email "email-yang-sudah-terdaftar"
 * Periode tetap:  node seed-dummy-soa.cjs --period 2026-11
 * Bantuan:        node seed-dummy-soa.cjs --help
 *
 * Bawaan: buat akun user demo.soa@example.com, password DemoSOA2026!
 * Admin: buat/reuse admin.soa@example.com dengan --admin, password AdminSOA2026!
 * Password akun yang sudah ada tidak pernah diganti.
 *
 * Isi untuk database kosong yang sudah dimigrasi:
 * - 56 transaksi income/expense, tersebar di 3 bulan.
 * - 3 anggaran bulanan dan 15 relasi anggaran-kategori.
 * - 6 wishlist cash/cicilan, 28 jadwal cicilan; yang paid ditautkan ke expense.
 * - 4 biaya rutin, 18 jadwal; yang paid ditautkan ke expense.
 * - 3 paket token dan 3 order lokal: pending, cancelled, expired.
 * - Wallet baru bersaldo 0; tidak menambah saldo wallet yang sudah ada.
 *
 * Tidak memanggil API Midtrans/AI/bank, tidak membuat pembayaran paid,
 * tidak mengisi riwayat AI, tidak menulis .env,
 * tidak UPDATE/DELETE/TRUNCATE/ALTER tabel atau menimpa data sebelumnya.
 * Pemakaian --admin dapat menetapkan role admin pada akun admin dummy.
 * Data yang sudah tersedia dilewati. Seluruh INSERT berada dalam transaksi.
 * Jalankan ulang untuk periode yang sama tanpa menggandakan data yang utuh.
 * Tanggal transaksi disimpan UTC (pukul 12.00 WIB), mengikuti backend proyek.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomBytes, scryptSync, createHash } = require('node:crypto');

const DEMO_EMAIL = 'demo.soa@example.com';
const DEMO_PASSWORD = 'DemoSOA2026!';
const DEMO_NAME = 'Pengguna DEMO SOA';
const ADMIN_EMAIL = 'admin.soa@example.com';
const ADMIN_PASSWORD = 'AdminSOA2026!';
const ADMIN_NAME = 'Administrator DEMO SOA';
const TAG = 'DEMO-SOA-v1';

function optionsFrom(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === '--help' || flag === '-h') options.help = true;
    else if (flag === '--admin') options.admin = true;
    else if (['--email', '--period', '--project'].includes(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Nilai ${flag} belum diisi.`);
      options[flag.slice(2)] = value;
    } else throw new Error(`Argumen tidak dikenal: ${flag}. Gunakan --help.`);
  }
  if (options.admin && options.email) {
    throw new Error('--admin dan --email tidak boleh dipakai bersamaan.');
  }
  if (options.email) {
    options.email = options.email.trim().toLowerCase();
    if (options.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.email)) {
      throw new Error('Format --email tidak valid.');
    }
  }
  if (options.period && !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(options.period)) {
    throw new Error('Format --period harus YYYY-MM, misalnya 2026-11 (tahun 2000-2099).');
  }
  return options;
}

function findProjectRoot(explicit) {
  const candidates = explicit ? [path.resolve(explicit)] : [
    process.cwd(), __dirname, path.dirname(process.cwd()),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'js', 'package.json')) &&
        fs.existsSync(path.join(candidate, 'laravel', 'artisan'))) return candidate;
  }
  throw new Error('Folder proyek tidak ditemukan. Jalankan dari folder yang berisi js/ dan laravel/, atau gunakan --project "lokasi-proyek".');
}

function jakartaPeriod() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}`;
}

function calendar(period) {
  const [year, month] = period.split('-').map(Number);
  const date = (offset, day = 1) => {
    const value = new Date(Date.UTC(year, month - 1 + offset, 1));
    const maxDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, maxDay));
    return value.toISOString().slice(0, 10);
  };
  return { date, month: (offset) => date(offset).slice(0, 7) };
}

const stamp = (date) => `${date} 05:00:00`; // 12.00 WIB = 05.00 UTC.
const rupiah = (value) => `${value}.00`;
const fromCents = (value) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;

const REQUIRED = {
  users: ['id', 'name', 'email', 'password', 'role', 'deletedAt'],
  categories: ['id', 'name', 'icon'],
  transactions: ['id_transaction', 'id_user', 'id_category', 'type', 'nominal', 'catatan', 'createdAt', 'updatedAt'],
  budget: ['budget_id', 'user_id', 'month', 'year'],
  budget_categories: ['id', 'budget_id', 'category_id', 'allocated_amount'],
  wishes: ['id_wish', 'user_id', 'name', 'price', 'payment_method', 'down_payment', 'tenor_months', 'installment_amount', 'status', 'paid_transaction_id'],
  installment_schedules: ['id_installment', 'wish_id', 'period_number', 'due_date', 'amount_snapshot', 'status', 'transaction_id'],
  recurring_costs: ['id_recurring_cost', 'user_id', 'category_id', 'name', 'amount', 'interval', 'start_date', 'next_due_date', 'due_day', 'status', 'end_date', 'deletedAt'],
  recurring_occurrences: ['id_occurrence', 'recurring_cost_id', 'scheduled_for', 'due_date', 'amount_snapshot', 'status', 'transaction_id'],
  token_bundles: ['id', 'name', 'token_quota', 'price_idr', 'is_active', 'deletedAt'],
  token_purchases: ['id', 'order_id', 'user_id', 'token_bundle_id', 'idempotency_key', 'status', 'bundle_name_snapshot', 'price_idr_snapshot', 'token_quota_snapshot', 'currency', 'provider_response'],
  token_wallets: ['user_id', 'balance', 'available_tokens', 'reserved_tokens'],
};

async function checkSchema(connection, database) {
  const [columns] = await connection.execute(
    'SELECT TABLE_NAME AS tab, COLUMN_NAME AS col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?', [database],
  );
  const [tables] = await connection.execute(
    'SELECT TABLE_NAME AS tab, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [database],
  );
  const present = new Set(columns.map((row) => `${row.tab}.${row.col}`));
  const engines = new Map(tables.map((row) => [row.tab, row.engine]));
  const missing = Object.entries(REQUIRED).flatMap(([table, fields]) =>
    fields.filter((field) => !present.has(`${table}.${field}`)).map((field) => `${table}.${field}`));
  if (missing.length) throw new Error(`Skema belum sesuai ZIP (5). Jalankan npm --prefix js run db:migrate dahulu. Kolom belum ada: ${missing.join(', ')}`);
  if (Object.keys(REQUIRED).some((table) => engines.get(table)?.toLowerCase() !== 'innodb')) {
    throw new Error('Seeder memerlukan tabel InnoDB agar kegagalan bisa di-rollback. Tidak ada skema yang diubah.');
  }
}

async function seed(connection, options, period) {
  const counts = {};
  const { date, month } = calendar(period);

  // Nama tabel/kolom berasal dari konstanta skrip. Semua nilai memakai binding.
  const ensure = async (table, idField, where, values) => {
    if (!Object.hasOwn(REQUIRED, table)) throw new Error('Tabel seed tidak dikenal.');
    const keys = Object.keys(where);
    const [found] = await connection.execute(
      `SELECT * FROM \`${table}\` WHERE ${keys.map((key) => `\`${key}\` <=> ?`).join(' AND ')} LIMIT 1`,
      Object.values(where),
    );
    if (found.length) return { row: found[0], added: false };
    const fields = Object.keys(values);
    const [result] = await connection.execute(
      `INSERT INTO \`${table}\` (${fields.map((field) => `\`${field}\``).join(',')}) VALUES (${fields.map(() => '?').join(',')})`,
      Object.values(values),
    );
    counts[table] = (counts[table] || 0) + 1;
    return { row: { ...values, [idField]: result.insertId }, added: true };
  };

  const email = options.admin ? ADMIN_EMAIL : (options.email || DEMO_EMAIL);
  const [users] = await connection.execute('SELECT id, name, role, deletedAt FROM users WHERE email = ? LIMIT 1 FOR UPDATE', [email]);
  let userId;
  let createdUser = false;
  let roleUpdated = false;
  if (users.length) {
    if (users[0].deletedAt) throw new Error('Akun tujuan sudah diarsipkan. Pilih akun aktif dengan --email.');
    if (options.admin && users[0].role !== 'admin') {
      await connection.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', users[0].id]);
      roleUpdated = true;
    } else if (!options.email && !options.admin && (users[0].name !== DEMO_NAME || users[0].role !== 'user')) {
      throw new Error('Alamat demo sudah digunakan akun lain. Gunakan --email untuk memilih akun tujuan secara eksplisit.');
    }
    userId = users[0].id;
  } else {
    if (options.email) throw new Error('Akun --email belum terdaftar. Daftarkan dahulu, atau jalankan tanpa --email untuk membuat akun demo.');
    const salt = randomBytes(16).toString('hex');
    const password = options.admin ? ADMIN_PASSWORD : DEMO_PASSWORD;
    const name = options.admin ? ADMIN_NAME : DEMO_NAME;
    const role = options.admin ? 'admin' : 'user';
    const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
    const [result] = await connection.execute('INSERT INTO users (name,email,password,role) VALUES (?,?,?,?)', [name, email, hash, role]);
    userId = result.insertId;
    counts.users = 1;
    createdUser = true;
  }

  const categories = {};
  for (const [name, icon] of [
    ['Gaji', 'salary'], ['Freelance', 'work'], ['Makanan', 'food'],
    ['Transportasi', 'transport'], ['Hiburan', 'entertainment'], ['Tagihan', 'bill'], ['Belanja', 'shopping'],
  ]) {
    categories[name] = (await ensure('categories', 'id', { name }, { name, icon })).row.id;
  }

  const transaction = async (key, category, type, amount, day, description) => {
    const note = `[${TAG}:${key}] ${description}`;
    const values = { id_user: userId, id_category: categories[category], type, nominal: amount,
      catatan: note, createdAt: stamp(day), updatedAt: stamp(day) };
    return (await ensure('transactions', 'id_transaction', { id_user: userId, catatan: note }, values)).row.id_transaction;
  };

  const baseTransactions = [
    [1, 'Gaji', 'income', 8500000, 'Gaji bulanan'],
    [3, 'Freelance', 'income', 1500000, 'Pendapatan proyek freelance'],
    [2, 'Makanan', 'expense', 28000, 'Sarapan'],
    [4, 'Transportasi', 'expense', 100000, 'Isi bahan bakar'],
    [5, 'Makanan', 'expense', 45000, 'Makan siang'],
    [7, 'Belanja', 'expense', 225000, 'Belanja kebutuhan rumah'],
    [9, 'Hiburan', 'expense', 65000, 'Tiket bioskop'],
    [10, 'Makanan', 'expense', 160000, 'Belanja bahan makanan'],
    [12, 'Transportasi', 'expense', 35000, 'Ojek online'],
    [14, 'Tagihan', 'expense', 175000, 'Listrik'],
    [16, 'Makanan', 'expense', 52000, 'Makan malam'],
    [18, 'Tagihan', 'expense', 85000, 'Pulsa dan paket data'],
    [20, 'Freelance', 'income', 750000, 'Pendapatan revisi desain'],
    [21, 'Belanja', 'expense', 125000, 'Alat tulis dan kebutuhan kerja'],
    [23, 'Hiburan', 'expense', 95000, 'Rekreasi akhir pekan'],
    [25, 'Makanan', 'expense', 75000, 'Makan bersama teman'],
  ];
  for (const offset of [-2, -1, 0]) {
    for (const [index, [day, category, type, amount, description]] of baseTransactions.entries()) {
      await transaction(`${month(offset)}:tx:${index + 1}`, category, type, rupiah(amount), date(offset, day), description);
    }
    const [year, m] = month(offset).split('-').map(Number);
    const budget = (await ensure('budget', 'budget_id', { user_id: userId, month: m, year }, { user_id: userId, month: m, year })).row;
    for (const [name, amount] of [['Makanan', 1500000], ['Transportasi', 750000], ['Hiburan', 500000], ['Tagihan', 2500000], ['Belanja', 1250000]]) {
      const where = { budget_id: budget.budget_id, category_id: categories[name] };
      await ensure('budget_categories', 'id', where, { ...where, allocated_amount: rupiah(amount) });
    }
  }

  const wishes = [
    { key: 'laptop', name: '[DEMO SOA] Laptop kerja', price: 12500000, method: 'installment', down: 2500000, tenor: 12, firstPaid: true },
    { key: 'smartphone', name: '[DEMO SOA] Smartphone', price: 6500000, method: 'installment', down: 1000000, tenor: 10 },
    { key: 'kursi', name: '[DEMO SOA] Kursi ergonomis', price: 2900000, method: 'installment', down: 500000, tenor: 6 },
    { key: 'sepeda', name: '[DEMO SOA] Sepeda lipat', price: 3800000, method: 'cash', down: 0, tenor: null },
    { key: 'meja', name: '[DEMO SOA] Meja kerja', price: 2400000, method: 'cash', down: 0, tenor: null },
    { key: 'headphone', name: '[DEMO SOA] Headphone', price: 1850000, method: 'cash', down: 0, tenor: null, paid: true },
  ];
  for (const wish of wishes) {
    // Wishlist yang sudah ada dilewati seluruhnya, termasuk jadwal yang diedit pengguna.
    const [previous] = await connection.execute('SELECT id_wish FROM wishes WHERE user_id = ? AND name = ? LIMIT 1', [userId, wish.name]);
    if (previous.length) continue;
    const remaining = BigInt(wish.price - wish.down) * 100n;
    const installment = wish.tenor ? remaining / BigInt(wish.tenor) : null;
    const paidTransactionId = wish.paid ? await transaction(`wish:${wish.key}:cash`, 'Belanja', 'expense', rupiah(wish.price), date(-1, 18), `Pembelian ${wish.name}`) : null;
    const row = (await ensure('wishes', 'id_wish', { user_id: userId, name: wish.name }, {
      user_id: userId, name: wish.name, price: rupiah(wish.price), payment_method: wish.method,
      down_payment: rupiah(wish.down), tenor_months: wish.tenor,
      installment_amount: installment === null ? null : fromCents(installment),
      status: wish.paid ? 'paid' : 'planned', paid_transaction_id: paidTransactionId,
    })).row;
    for (let number = 1; number <= (wish.tenor || 0); number += 1) {
      const amount = number === wish.tenor ? remaining - installment * BigInt(wish.tenor - 1) : installment;
      const due = date(number - 2, 15);
      const paid = wish.firstPaid && number === 1;
      const transactionId = paid ? await transaction(`wish:${wish.key}:installment:${number}`, 'Belanja', 'expense', fromCents(amount), due, `Cicilan ${number}: ${wish.name}`) : null;
      const where = { wish_id: row.id_wish, period_number: number };
      await ensure('installment_schedules', 'id_installment', where, { ...where, due_date: due, amount_snapshot: fromCents(amount), status: paid ? 'paid' : 'planned', transaction_id: transactionId });
    }
  }

  for (const cost of [
    { key: 'internet', name: '[DEMO SOA] Internet rumah', amount: 325000, day: 5 },
    { key: 'musik', name: '[DEMO SOA] Langganan musik', amount: 55000, day: 12 },
    { key: 'kos', name: '[DEMO SOA] Sewa kos', amount: 1500000, day: 1 },
    { key: 'cloud', name: '[DEMO SOA] Penyimpanan cloud', amount: 350000, day: 10, yearly: true },
  ]) {
    const [previous] = await connection.execute('SELECT id_recurring_cost FROM recurring_costs WHERE user_id = ? AND name = ? LIMIT 1', [userId, cost.name]);
    if (previous.length) continue;
    const row = (await ensure('recurring_costs', 'id_recurring_cost', { user_id: userId, name: cost.name }, {
      user_id: userId, category_id: categories.Tagihan, name: cost.name, amount: rupiah(cost.amount),
      interval: cost.yearly ? 'yearly' : 'monthly', start_date: date(-2, cost.day),
      next_due_date: date(cost.yearly ? 10 : 0, cost.day), due_day: cost.day,
      status: cost.yearly ? 'paused' : 'active', end_date: null, deletedAt: null,
    })).row;
    const offsets = cost.yearly ? [10, 22, 34] : [-2, -1, 0, 1, 2];
    for (const offset of offsets) {
      const due = date(offset, cost.day);
      const paid = !cost.yearly && offset < 0;
      const transactionId = paid ? await transaction(`recurring:${cost.key}:${month(offset)}`, 'Tagihan', 'expense', rupiah(cost.amount), due, cost.name) : null;
      const where = { recurring_cost_id: row.id_recurring_cost, scheduled_for: due };
      await ensure('recurring_occurrences', 'id_occurrence', where, { ...where, due_date: due, amount_snapshot: rupiah(cost.amount), status: paid ? 'paid' : 'planned', transaction_id: transactionId });
    }
  }

  const bundles = [];
  for (const values of [
    { name: 'DEMO Hemat', token_quota: 1000, price_idr: '15000.00', is_active: 1, deletedAt: null },
    { name: 'DEMO Rutin', token_quota: 5000, price_idr: '65000.00', is_active: 1, deletedAt: null },
    { name: 'DEMO Ekstra', token_quota: 12000, price_idr: '140000.00', is_active: 1, deletedAt: null },
  ]) bundles.push((await ensure('token_bundles', 'id', { name: values.name }, values)).row);
  for (const [index, status] of ['pending', 'cancelled', 'expired'].entries()) {
    const bundle = bundles[index];
    const values = {
      order_id: `DEMO-SOA-${userId}-${index + 1}`, user_id: userId, token_bundle_id: bundle.id,
      idempotency_key: `${TAG}:purchase:${userId}:${index + 1}`, status,
      bundle_name_snapshot: bundle.name, price_idr_snapshot: bundle.price_idr,
      token_quota_snapshot: bundle.token_quota, currency: 'IDR',
      provider_response: JSON.stringify({ source: 'local_dummy', note: 'Contoh order lokal; belum dikirim ke Midtrans.' }),
    };
    await ensure('token_purchases', 'id', { user_id: userId, idempotency_key: values.idempotency_key }, values);
  }
  // Hanya membuat wallet kosong bila belum tersedia. Saldo lama tidak disentuh.
  await ensure('token_wallets', 'user_id', { user_id: userId }, {
    user_id: userId, balance: 0, available_tokens: 0, reserved_tokens: 0,
  });
  return { email, userId, createdUser, roleUpdated, counts };
}

async function main() {
  const options = optionsFrom(process.argv.slice(2));
  if (options.help) {
    console.log([
      'DATA DUMMY SOA (ZIP 5) - tidak mengubah kode atau skema proyek.',
      'Simpan di folder utama, sejajar js/ dan laravel/. MySQL dan migrasi harus siap.',
      'node seed-dummy-soa.cjs                  Buat/reuse akun demo khusus.',
      'node seed-dummy-soa.cjs --admin          Buat/reuse akun administrator demo.',
      'node seed-dummy-soa.cjs --email "email"  Isi akun aktif yang sudah terdaftar.',
      'node seed-dummy-soa.cjs --period 2026-11  Pilih bulan akhir; bawaan bulan ini WIB.',
      'node seed-dummy-soa.cjs --project "path"  Tentukan folder utama proyek.',
      'Bawaan login: demo.soa@example.com / DemoSOA2026! (akun baru saja).',
      'Admin login: admin.soa@example.com / AdminSOA2026! (akun baru dengan --admin).',
      '56 transaksi, 3 anggaran, 6 wish, 28 cicilan, 4 biaya rutin, 18 jadwal, 3 paket/order.',
      'Semua order belum paid; tidak memberi kuota token atau memanggil API eksternal.',
      'Periode sama + data utuh: pengulangan dilewati; tidak mereset data lama.',
    ].join('\n'));
    return;
  }
  const root = findProjectRoot(options.project);
  const requireProject = createRequire(path.join(root, 'js', 'package.json'));
  let mysql;
  try {
    requireProject('dotenv').config({ path: path.join(root, 'js', '.env'), quiet: true });
    mysql = requireProject('mysql2/promise');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') throw new Error('Dependency belum terpasang. Jalankan npm --prefix js install dari folder utama.');
    throw error;
  }
  if (process.env.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new Error('Data dummy hanya untuk development/test. NODE_ENV=production ditolak.');
  }
  const period = options.period || jakartaPeriod();
  const database = process.env.DB_NAME || 'asisten_keuangan';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database,
    ...(process.env.DB_SOCKET_PATH ? { socketPath: process.env.DB_SOCKET_PATH } : {}),
    dateStrings: true, supportBigNumbers: true, bigNumberStrings: true, timezone: 'Z',
  });
  const lockName = `soa_dummy_v1_${createHash('sha256').update(database).digest('hex').slice(0, 32)}`;
  let locked = false;
  let started = false;
  try {
    await checkSchema(connection, database);
    const [[lock]] = await connection.execute('SELECT GET_LOCK(?, 10) AS acquired', [lockName]);
    locked = Number(lock.acquired) === 1;
    if (!locked) throw new Error('Seeder dummy lain masih berjalan. Coba kembali setelah selesai.');
    await connection.beginTransaction();
    started = true;
    const result = await seed(connection, options, period);
    await connection.commit();
    started = false;
    console.log(`\nData dummy selesai. Database: ${database}; akun: ${result.email}`);
    console.log(`Periode transaksi: ${calendar(period).month(-2)} sampai ${period}.`);
    console.log('Baris baru yang ditambahkan:');
    for (const table of Object.keys(REQUIRED)) console.log(`  ${table}: ${result.counts[table] || 0}`);
    if (result.createdUser && options.admin) console.log(`\nLogin admin demo baru: ${result.email}\nPassword admin demo: ${ADMIN_PASSWORD}`);
    else if (result.createdUser) console.log(`\nLogin demo baru: ${result.email}\nPassword demo: ${DEMO_PASSWORD}`);
    else if (options.admin && result.roleUpdated) console.log('\nAkun admin dummy dipromosikan menjadi role admin; password lama tetap dipakai.');
    else if (options.admin) console.log('\nAkun admin dummy reuse sebagai role admin; gunakan password yang berlaku.');
    else console.log('\nGunakan password akun yang berlaku; password/role tidak diubah.');
    console.log('Refresh dashboard setelah login sebagai akun di atas.');
    console.log('Order hanya contoh lokal, belum dibayar di Midtrans; saldo token lama tidak diubah.');
  } catch (error) {
    if (started) await connection.rollback();
    throw error;
  } finally {
    try { if (locked) await connection.execute('SELECT RELEASE_LOCK(?)', [lockName]); }
    finally { await connection.end(); }
  }
}

if (require.main === module) {
  main().catch((error) => {
    const common = {
      ECONNREFUSED: 'MySQL belum dapat dihubungi. Aktifkan MySQL di Laragon dan periksa DB_HOST/DB_PORT di js/.env.',
      ER_ACCESS_DENIED_ERROR: 'Akses database ditolak. Periksa DB_USER/DB_PASSWORD di js/.env.',
      ER_BAD_DB_ERROR: 'Database belum ada. Jalankan npm --prefix js run db:migrate dahulu.',
    };
    console.error(`[dummy] Gagal: ${common[error.code] || error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { calendar, fromCents, optionsFrom };
