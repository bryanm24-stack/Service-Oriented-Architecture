const { Op } = require('sequelize');
const { RecurringCost, RecurringOccurrence, Category, sequelize } = require('../models');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const schemas = require('../utils/validation/recurringCostSchemas');
const httpError = require('../utils/httpError');
const Joi = require('joi');

const cents = (value) => Math.round(Number(value) * 100);
const money = (value) => (cents(value) / 100).toFixed(2);
const owner = (req) => ({ user_id: req.user.id });
const dateParts = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
};
const lastDay = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const addPeriod = (value, interval, periods = 1, anchorDay = null) => {
  const { year, month, day } = dateParts(value);
  const targetMonth = month + (interval === 'monthly' ? periods : 12 * periods);
  const target = new Date(Date.UTC(year, targetMonth - 1, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonthNumber = target.getUTCMonth() + 1;
  const clampedDay = Math.min(anchorDay || day, lastDay(targetYear, targetMonthNumber));
  return `${targetYear}-${String(targetMonthNumber).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
};
const serializeOccurrence = (row) => {
  const value = row.toJSON ? row.toJSON() : row;
  return { ...value, amount_snapshot: money(value.amount_snapshot) };
};
const serialize = (row, includeOccurrences = true) => {
  const value = row.toJSON ? row.toJSON() : row;
  return {
    ...value,
    amount: money(value.amount),
    occurrences: includeOccurrences ? (value.occurrences || []).map(serializeOccurrence) : undefined,
  };
};
const owned = (req, options = {}) => RecurringCost.findOne({
  where: { id_recurring_cost: parse(idSchema, req.params.id), ...owner(req) }, ...options,
});
const include = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'icon'] },
  { model: RecurringOccurrence, as: 'occurrences', separate: true, order: [['scheduled_for', 'ASC']] },
];
const previewRows = (input, count = 12) => {
  let date = input.next_due_date;
  const anchorDay = dateParts(input.next_due_date).day;
  const rows = [];
  for (let index = 0; index < count; index += 1) {
    if (input.end_date && date > input.end_date) break;
    rows.push({ occurrence_number: index + 1, scheduled_for: date, due_date: date, amount_snapshot: money(input.amount) });
    date = addPeriod(date, input.interval, 1, anchorDay);
  }
  return rows;
};
const list = async (req, res) => {
  const query = parse(schemas.query, req.query);
  const where = { ...owner(req) };
  if (query.status) where.status = query.status;
  if (query.category_id) where.category_id = query.category_id;
  const options = { where, include };
  if (!query.include_archived) options.paranoid = true;
  const rows = await RecurringCost.findAll({ ...options, order: [['createdAt', 'DESC']] });
  res.json({ success: true, data: rows.map((row) => serialize(row)) });
};
const getOne = async (req, res) => {
  const row = await owned(req, { include });
  if (!row) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  res.json({ success: true, data: serialize(row) });
};
const preview = async (req, res) => {
  const input = parse(schemas.create, req.body);
  const count = Math.min(Number(req.body.count || 12), 36);
  res.json({ success: true, data: previewRows(input, count), policy: 'Tanggal 29/30/31 diklem ke hari terakhir bulan target; Februari mengikuti tahun kabisat.' });
};
const create = async (req, res) => {
  const input = parse(schemas.create, req.body);
  const result = await sequelize.transaction(async (transaction) => {
    if (!(await Category.findByPk(input.category_id, { transaction }))) throw httpError(404, 'Kategori tidak ditemukan');
    const row = await RecurringCost.create({ ...input, user_id: req.user.id, due_day: dateParts(input.next_due_date).day }, { transaction });
    await RecurringOccurrence.bulkCreate(previewRows(input).map((occurrence) => ({
      recurring_cost_id: row.id_recurring_cost,
      scheduled_for: occurrence.scheduled_for,
      due_date: occurrence.due_date,
      amount_snapshot: occurrence.amount_snapshot,
    })), { transaction });
    return RecurringCost.findByPk(row.id_recurring_cost, { include, transaction });
  });
  res.location(`/api/v1/recurring-costs/${result.id_recurring_cost}`).status(201).json({ success: true, data: serialize(result) });
};
const update = async (req, res) => {
  const input = parse(schemas.patch, req.body);
  const row = await owned(req);
  if (!row) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  if (input.category_id && !(await Category.findByPk(input.category_id))) throw httpError(404, 'Kategori tidak ditemukan');
  if (input.start_date && input.next_due_date && input.next_due_date < input.start_date) throw httpError(400, 'Tanggal jatuh tempo berikutnya tidak boleh sebelum tanggal mulai');
  const values = { ...input };
  if (input.next_due_date) values.due_day = dateParts(input.next_due_date).day;
  await row.update(values);
  res.json({ success: true, data: serialize(await RecurringCost.findByPk(row.id_recurring_cost, { include })) });
};
const setStatus = async (req, res) => {
  const status = parse(JoiStatus, req.body).status;
  const row = await owned(req);
  if (!row) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  await row.update({ status });
  res.json({ success: true, data: serialize(row, false) });
};
const archive = async (req, res) => {
  const row = await owned(req);
  if (!row) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  await row.destroy();
  res.status(204).send();
};
const listOccurrences = async (req, res) => {
  const row = await owned(req, { attributes: ['id_recurring_cost'] });
  if (!row) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  const where = { recurring_cost_id: row.id_recurring_cost };
  if (req.query.status === 'upcoming') where.status = { [Op.in]: ['planned', 'locked'] };
  if (req.query.status === 'paid') where.status = 'paid';
  const occurrences = await RecurringOccurrence.findAll({ where, order: [['scheduled_for', 'ASC']] });
  res.json({ success: true, data: occurrences.map(serializeOccurrence) });
};
const updateOccurrence = async (req, res) => {
  const input = parse(schemas.occurrencePatch, req.body);
  const cost = await owned(req, { attributes: ['id_recurring_cost'] });
  if (!cost) throw httpError(404, 'Template pengeluaran berulang tidak ditemukan');
  const occurrence = await RecurringOccurrence.findOne({
    where: { id_occurrence: parse(idSchema, req.params.occurrenceId), recurring_cost_id: cost.id_recurring_cost },
  });
  if (!occurrence) throw httpError(404, 'Occurrence tidak ditemukan');
  const today = new Date().toISOString().slice(0, 10);
  if (occurrence.status !== 'planned' || occurrence.locked_at || occurrence.due_date < today) {
    throw httpError(409, 'Occurrence yang sudah terkunci, terbayar, atau lewat jatuh tempo tidak dapat diubah');
  }
  await occurrence.update(input);
  res.json({ success: true, data: serializeOccurrence(occurrence) });
};
const JoiStatus = Joi.object({ status: Joi.string().valid('active', 'paused').required() });
module.exports = { list, getOne, preview, create, update, setStatus, archive, listOccurrences, updateOccurrence, addPeriod, previewRows };
