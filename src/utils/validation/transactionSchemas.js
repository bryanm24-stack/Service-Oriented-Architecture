const Joi = require('joi');
const id = Joi.number().integer().min(1).max(2147483647);
const money = Joi.alternatives()
  .try(Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/), Joi.number().min(0).max(9999999999999.99))
  .custom((v, h) =>
    /^\d{1,13}(\.\d{1,2})?$/.test(String(v)) ? String(v) : h.error('any.invalid'),
  );
const fields = {
  id_user: id,
  id_category: id,
  type: Joi.string().valid('income', 'expense'),
  nominal: money,
  catatan: Joi.string().max(10000).allow('', null),
};
const create = Joi.object({
  ...fields,
  id_category: id.required(),
  type: fields.type.default('expense'),
  nominal: money.required(),
});
const put = Joi.object({
  ...fields,
  id_category: id.required(),
  type: fields.type.required(),
  nominal: money.required(),
  catatan: fields.catatan.required(),
});
const patch = Joi.object({
  id_category: id,
  type: fields.type,
  nominal: money,
  catatan: fields.catatan,
}).min(1);
const date = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((v, h) => {
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v
      ? v
      : h.error('any.invalid');
  });
const query = Joi.object({
  search: Joi.string().max(255).allow('').default(''),
  type: fields.type,
  category_id: id,
  user_id: id,
  start_date: date,
  end_date: date,
  period: Joi.string().pattern(/^20\d{2}-(0[1-9]|1[0-2])$/),
  sort: Joi.string().lowercase().valid('asc', 'desc').default('desc'),
  sort_by: Joi.string().valid('createdAt', 'nominal', 'id_transaction').default('createdAt'),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).max(10000000).default(0),
  minNominal: money,
  maxNominal: money,
  mode: Joi.string().valid('orm', 'raw').default('orm'),
}).custom((v, h) => {
  if (v.period && (v.start_date || v.end_date))
    return h.message('Gunakan periode atau rentang tanggal, bukan keduanya');
  if (v.start_date && v.end_date && v.start_date > v.end_date)
    return h.message('Tanggal awal tidak boleh melewati tanggal akhir');
  if (
    v.minNominal !== undefined &&
    v.maxNominal !== undefined &&
    Number(v.minNominal) > Number(v.maxNominal)
  )
    return h.message('Nominal minimum melebihi maksimum');
  return v;
});
module.exports = { create, put, patch, query };
