const { Op } = require('sequelize');
const { ownerWhere, isAdmin } = require('../utils/access');
const httpError = require('../utils/httpError');
const { parse } = require('../utils/validation/resourceSchemas');
const schemas = require('../utils/validation/transactionSchemas');
// One filter plan for ORM, RAW and cash-flow aggregation. Business dates use Asia/Jakarta.
const plan = (req, extra = {}) => {
  const q = parse(schemas.query, req.query);
  const where = { ...ownerWhere(req), ...extra };
  if (q.user_id !== undefined) {
    if (!isAdmin(req) && q.user_id !== req.user.id) throw httpError(404, 'Data tidak ditemukan');
    if (where.id_user !== undefined && where.id_user !== q.user_id)
      throw httpError(400, 'Filter user tidak sesuai URL');
    where.id_user = q.user_id;
  }
  if (q.category_id !== undefined) {
    if (where.id_category !== undefined && where.id_category !== q.category_id)
      throw httpError(400, 'Kategori tidak sesuai URL');
    where.id_category = q.category_id;
  }
  if (q.type) where.type = q.type;
  if (q.search) where.catatan = { [Op.like]: `%${q.search}%` };
  if (q.minNominal !== undefined || q.maxNominal !== undefined) {
    where.nominal = {};
    if (q.minNominal !== undefined) where.nominal[Op.gte] = q.minNominal;
    if (q.maxNominal !== undefined) where.nominal[Op.lte] = q.maxNominal;
  }
  let start = q.start_date,
    end = q.end_date;
  if (q.period) {
    start = q.period + '-01';
    const [year, month] = q.period.split('-').map(Number);
    end = `${year}-${String(month).padStart(2, '0')}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
  }
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt[Op.gte] = new Date(start + 'T00:00:00+07:00');
    if (end)
      where.createdAt[Op.lt] = new Date(new Date(end + 'T00:00:00+07:00').getTime() + 86400000);
  }
  const clauses = [],
    replacements = {};
  for (const field of ['id_user', 'id_category', 'type'])
    if (where[field] !== undefined) {
      clauses.push(`t.${field} = :${field}`);
      replacements[field] = where[field];
    }
  if (q.search) {
    clauses.push('t.catatan LIKE :search');
    replacements.search = `%${q.search}%`;
  }
  if (q.minNominal !== undefined) {
    clauses.push('t.nominal >= :minNominal');
    replacements.minNominal = q.minNominal;
  }
  if (q.maxNominal !== undefined) {
    clauses.push('t.nominal <= :maxNominal');
    replacements.maxNominal = q.maxNominal;
  }
  if (start) {
    clauses.push('t.createdAt >= :start');
    replacements.start = where.createdAt[Op.gte].toISOString().slice(0, 19).replace('T', ' ');
  }
  if (end) {
    clauses.push('t.createdAt < :end');
    replacements.end = where.createdAt[Op.lt].toISOString().slice(0, 19).replace('T', ' ');
  }
  return {
    q,
    where,
    replacements,
    sqlWhere: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
  };
};
module.exports = { plan };
