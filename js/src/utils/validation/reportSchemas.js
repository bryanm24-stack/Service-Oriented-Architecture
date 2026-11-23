const Joi = require('joi');
const { idSchema } = require('./resourceSchemas');

const MAX_REPORT_DAYS = 366;

const getExpenseReportSchema = Joi.object({
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages
  ({
    'string.pattern.base': 'Tanggal mulai pelaporan harus dalam format YYYY-MM-DD.',
    'any.required': 'Tanggal mulai pelaporan wajib diisi.',
  }),
  endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Tanggal selesai pelaporan harus dalam format YYYY-MM-DD.',
    'any.required': 'Tanggal selesai pelaporan wajib diisi.',
  }),
  sort: Joi.string().valid('asc', 'desc').default('asc'),
}).custom((value, helpers) => {
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
    if (start > end) {
    return helpers.error('date.order');
    }
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > MAX_REPORT_DAYS) {
    return helpers.error('date.range');
    }
    return value;
}).unknown(false);

module.exports = {
  getExpenseReportSchema,
};