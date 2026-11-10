const Joi = require('joi');
const { Wish, InstallmentSchedule, Transaction, Category, sequelize } = require('../models');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const httpError = require('../utils/httpError');


const wishSchema = Joi.object({
  name: Joi.string().trim().min(2).max(180).required(),
  price: Joi.number().positive().precision(2).max(9999999999999.99).required(),
  payment_method: Joi.string().valid('cash', 'installment').required(),
  down_payment: Joi.number().min(0).precision(2).default(0),
  tenor_months: Joi.number().integer().min(1).max(120),
  tenor_years: Joi.number().integer().min(1).max(10),
}).custom((value, helpers) => {
  if (value.payment_method === 'cash') {
    if ((value.down_payment || 0) !== 0 || value.tenor_months || value.tenor_years) {
      return helpers.error('any.invalid', { message: 'Pembayaran cash tidak memakai uang muka atau tenor' });
    }
  } else {
    if ((value.down_payment || 0) >= value.price) return helpers.error('any.invalid', { message: 'Uang muka harus lebih kecil dari harga barang' });
    if (Boolean(value.tenor_months) === Boolean(value.tenor_years)) return helpers.error('any.invalid', { message: 'Isi salah satu: tenor bulan atau tenor tahun' });
  }
  return value;
}).unknown(false);

const simulationSchema = wishSchema;

const cents = (value) => Math.round(Number(value) * 100);
const decimal = (value) => (value / 100).toFixed(2);
const owner = (req) => ({ user_id: req.user.id });
const ownedWish = async (req, id, options = {}) => {
  const wish = await Wish.findOne({ where: { id_wish: parse(idSchema, id), ...owner(req) }, ...options });
  if (!wish) throw httpError(404, 'Wish tidak ditemukan');
  return wish;
};
const quote = (input) => {
  const price = cents(input.price);
  const down = input.payment_method === 'cash' ? 0 : cents(input.down_payment);
  if (down > price) throw httpError(400, 'Uang muka tidak boleh melebihi harga barang');
  if (input.payment_method === 'cash') {
    return { price: decimal(price), payment_method: 'cash', down_payment: '0.00', tenor_months: null, installment_amount: null, total_installment: '0.00', total_payment: decimal(price) };
  }
  const tenor = input.tenor_months || input.tenor_years * 12;
  if (!tenor || tenor < 1 || tenor > 120) throw httpError(400, 'Tenor harus 1 sampai 120 bulan');
  const remaining = price - down;
  if (remaining < tenor) throw httpError(400, 'Sisa harga harus minimal Rp0,01 untuk setiap periode cicilan');
  const each = Math.floor(remaining / tenor);
  const last = remaining - each * (tenor - 1);
  return {
    price: decimal(price), payment_method: 'installment', down_payment: decimal(down),
    tenor_months: tenor, installment_amount: decimal(each), last_installment_amount: decimal(last),
    total_installment: decimal(remaining), total_payment: decimal(price),
  };
};
const serialized = (wish) => wish.toJSON ? wish.toJSON() : wish;

const buildSchedules = (wishId, tenorMonths, remainingCents) => {
  const baseAmount = Math.floor(remainingCents / tenorMonths);
  const today = new Date();
  const anchorDay = today.getDate();
  const startMonth = today.getMonth() + 1;
  const startYear = today.getFullYear();

  return Array.from({ length: tenorMonths }, (_, index) => {
    const absoluteMonth = startMonth + index;
    const year = startYear + Math.floor(absoluteMonth / 12);
    const monthIndex = absoluteMonth % 12;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const day = Math.min(anchorDay, lastDay);
    const dueDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const amount = index === tenorMonths - 1
      ? remainingCents - baseAmount * (tenorMonths - 1)
      : baseAmount;

    return {
      wish_id: wishId,
      period_number: index + 1,
      due_date: dueDate,
      amount_snapshot: decimal(amount),
      status: 'planned',
    };
  });
};

const list = async (req, res) => {
  const rows = await Wish.findAll({
    where: owner(req),
    include: [{ model: InstallmentSchedule, as: 'installment_schedules', separate: true, order: [['period_number', 'ASC']] }],
    order: [['createdAt', 'DESC']],
  });
  res.json({ success: true, data: rows.map(serialized) });
};

const getOne = async (req, res) => {
  const wish = await ownedWish(req, req.params.id, {
    include: [{ model: InstallmentSchedule, as: 'installment_schedules', separate: true, order: [['period_number', 'ASC']] }],
  });
  res.json({ success: true, data: serialized(wish) });
};

const simulate = async (req, res) => {
  const input = parse(simulationSchema, req.body);
  if (input.tenor_years) input.tenor_months = input.tenor_years * 12;
  const data = quote(input);
  res.json({ success: true, data: { ...data, name: input.name } });
};

const create = async (req, res) => {
  const input = parse(wishSchema, req.body);
  if (input.tenor_years) input.tenor_months = input.tenor_years * 12;
  const userId = req.user.id;
  const result = await sequelize.transaction(async (transaction) => {
    const data = quote(input);
    const wish = await Wish.create({
      user_id: userId, name: input.name, price: data.price, payment_method: input.payment_method,
      down_payment: data.down_payment, tenor_months: data.tenor_months,
      installment_amount: data.installment_amount, status: 'planned',
    }, { transaction });
    if (input.payment_method === 'installment') {
      const schedules = buildSchedules(wish.id_wish, data.tenor_months, cents(data.total_installment));
      await InstallmentSchedule.bulkCreate(schedules, { transaction });
    }
    return Wish.findByPk(wish.id_wish, {
      include: [{ model: InstallmentSchedule, as: 'installment_schedules', separate: true, order: [['period_number', 'ASC']] }],
      transaction,
    });
  });
  res.location(`/api/v1/wishes/${result.id_wish}`).status(201).json({ success: true, data: serialized(result) });
};

const update = async (req, res) => {
  const input = parse(wishSchema, req.body);
  if (input.tenor_years) input.tenor_months = input.tenor_years * 12;
  const result = await sequelize.transaction(async (transaction) => {
    const wish = await ownedWish(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    const schedules = await InstallmentSchedule.findAll({ where: { wish_id: wish.id_wish }, transaction });
    if (wish.status === 'paid' || schedules.some((s) => s.status === 'paid')) throw httpError(409, 'Wish yang sudah dibayar tidak dapat diubah');
    const data = quote(input);
    await InstallmentSchedule.destroy({ where: { wish_id: wish.id_wish }, transaction });
    await wish.update({
      name: input.name, price: data.price, payment_method: input.payment_method,
      down_payment: data.down_payment, tenor_months: data.tenor_months,
      installment_amount: data.installment_amount, status: 'planned',
    }, { transaction });
    if (input.payment_method === 'installment') {
      const rows = buildSchedules(wish.id_wish, data.tenor_months, cents(data.total_installment));
      await InstallmentSchedule.bulkCreate(rows, { transaction });
    }
    return Wish.findByPk(wish.id_wish, { include: [{ model: InstallmentSchedule, as: 'installment_schedules', separate: true }], transaction });
  });
  res.json({ success: true, data: serialized(result) });
};

const remove = async (req, res) => {
  await sequelize.transaction(async (transaction) => {
    const wish = await ownedWish(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    const paid = await InstallmentSchedule.count({ where: { wish_id: wish.id_wish, status: 'paid' }, transaction });
    if (paid || wish.status === 'paid') throw httpError(409, 'Wish yang sudah memiliki pembayaran tidak dapat dihapus');
    await wish.destroy({ transaction });
  });
  res.status(204).send();
};

const recordExpense = async (userId, amount, note, transaction) => {
  const [category] = await Category.findOrCreate({
    where: { name: 'Wishlist/Cicilan' }, defaults: { name: 'Wishlist/Cicilan', icon: 'wallet' }, transaction,
  });
  return Transaction.create({
    id_user: userId, id_category: category.id, type: 'expense', nominal: decimal(amount), catatan: note,
  }, { transaction });
};

const payCash = async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const wish = await ownedWish(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (wish.payment_method !== 'cash') throw httpError(400, 'Wish ini menggunakan pembayaran cicilan');
    if (wish.status === 'paid') throw httpError(409, 'Wish sudah dibayar');
    const expense = await recordExpense(wish.user_id, cents(wish.price), `Pembelian cash: ${wish.name}`, transaction);
    await wish.update({ status: 'paid', paid_transaction_id: expense.id_transaction }, { transaction });
    return { wish, transaction: expense };
  });
  res.json({ success: true, data: { wish: serialized(result.wish), transaction: result.transaction.id_transaction } });
};

const payInstallment = async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const wish = await ownedWish(req, req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (wish.payment_method !== 'installment') throw httpError(400, 'Wish ini bukan pembayaran cicilan');
    const scheduleId = parse(idSchema, req.params.installmentId);
    const schedule = await InstallmentSchedule.findOne({
      where: { id_installment: scheduleId, wish_id: wish.id_wish }, transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!schedule) throw httpError(404, 'Jadwal cicilan tidak ditemukan');
    if (schedule.status === 'paid') throw httpError(409, 'Cicilan ini sudah dibayar');
    const expense = await recordExpense(wish.user_id, cents(schedule.amount_snapshot), `Cicilan ${schedule.period_number}/${wish.tenor_months}: ${wish.name}`, transaction);
    await schedule.update({ status: 'paid', transaction_id: expense.id_transaction }, { transaction });
    const unpaid = await InstallmentSchedule.count({ where: { wish_id: wish.id_wish, status: 'planned' }, transaction });
    if (unpaid === 0) await wish.update({ status: 'paid' }, { transaction });
    return { wish, schedule, transaction: expense, completed: unpaid === 0 };
  });
  res.json({ success: true, data: { wish: serialized(result.wish), installment: serialized(result.schedule), transaction: result.transaction.id_transaction, wish_completed: result.completed } });
};

module.exports = { list, getOne, simulate, create, update, remove, payCash, payInstallment };
