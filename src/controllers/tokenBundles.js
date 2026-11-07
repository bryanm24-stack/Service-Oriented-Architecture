const { TokenBundle, sequelize } = require('../models');
const { Op } = require('sequelize');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const schema = require('../utils/validation/tokenSchemas');
const httpError = require('../utils/httpError');

const list = (admin) => async (req, res) => {
  const { limit, offset, status } = parse(admin ? schema.adminList : schema.list, req.query);
  const where = {};
  if (!admin || status === 'active') Object.assign(where, { is_active: true, deletedAt: null });
  if (status === 'inactive') Object.assign(where, { is_active: false, deletedAt: null });
  if (status === 'archived') where.deletedAt = { [Op.ne]: null };
  const { rows, count } = await TokenBundle.findAndCountAll({
    where, paranoid: !admin, order: [['id', 'ASC']], limit, offset,
  });
  res.json({ data: rows, meta: { total: count, limit, offset } });
};
const show = async (req, res) => {
  parse(schema.empty, req.query);
  const bundle = await TokenBundle.findByPk(parse(idSchema, req.params.id), { paranoid: false });
  if (!bundle) throw httpError(404, 'Paket tidak ditemukan');
  res.json({ data: bundle });
};
const create = async (req, res) => {
  parse(schema.empty, req.query);
  const bundle = await TokenBundle.create(parse(schema.bundleCreate, req.body));
  res.location('/api/v1/admin/token-bundles/' + bundle.id).status(201)
    .json({ msg: 'Paket dibuat', data: bundle });
};
const update = (full) => async (req, res) => {
  parse(schema.empty, req.query);
  const id = parse(idSchema, req.params.id);
  const values = parse(full ? schema.bundlePut : schema.bundlePatch, req.body);
  const bundle = await sequelize.transaction(async (transaction) => {
    const row = await TokenBundle.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw httpError(404, 'Paket tidak ditemukan atau sudah diarsipkan');
    return row.update(values, { transaction });
  });
  res.json({ msg: 'Paket diperbarui', data: bundle });
};
const archive = async (req, res) => {
  parse(schema.empty, req.query);
  parse(schema.empty, req.body || {});
  const id = parse(idSchema, req.params.id);
  await sequelize.transaction(async (transaction) => {
    const row = await TokenBundle.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) throw httpError(404, 'Paket tidak ditemukan atau sudah diarsipkan');
    await row.update({ is_active: false }, { transaction });
    await row.destroy({ transaction });
  });
  res.status(204).send();
};

module.exports = { active: list(false), all: list(true), show, create, put: update(true), patch: update(false), archive };
