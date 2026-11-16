const Joi = require('joi');

const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
    ? value : helpers.error('date.invalid');
});
const amount = Joi.alternatives().try(
  Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/),
  Joi.number().positive().max(9999999999999.99),
).custom((value, helpers) => /^\d{1,13}(\.\d{1,2})?$/.test(String(value))
  ? String(value) : helpers.error('any.invalid'));
const fields = {
  name: Joi.string().trim().min(1).max(180),
  amount,
  category_id: Joi.number().integer().min(1).max(2147483647),
  interval: Joi.string().valid('monthly', 'yearly'),
  start_date: date,
  next_due_date: date,
  end_date: date.allow(null),
  status: Joi.string().valid('active', 'paused'),
};
const create = Joi.object({
  ...fields,
  name: fields.name.required(),
  amount: fields.amount.required(),
  category_id: fields.category_id.required(),
  interval: fields.interval.required(),
  start_date: fields.start_date.required(),
  next_due_date: fields.next_due_date.required(),
}).custom((value, helpers) => {
  if (value.end_date && value.end_date < value.start_date) return helpers.error('date.order');
  if (value.next_due_date < value.start_date) return helpers.error('date.order');
  return value;
}).unknown(false);
const patch = Joi.object(fields).min(1).custom((value, helpers) => {
  if (value.end_date && value.start_date && value.end_date < value.start_date) return helpers.error('date.order');
  return value;
}).unknown(false);
const query = Joi.object({
  status: Joi.string().valid('active', 'paused'),
  category_id: fields.category_id,
  include_archived: Joi.boolean().default(false),
}).unknown(false);
const occurrencePatch = Joi.object({
  due_date: date,
  scheduled_for: date,
  amount_snapshot: amount,
}).min(1).unknown(false);
module.exports = { create, patch, query, occurrencePatch, date };
