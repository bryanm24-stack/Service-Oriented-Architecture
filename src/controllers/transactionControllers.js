const { QueryTypes } = require('sequelize');
const { Transaction, Category, User, sequelize } = require('../models');
const httpError = require('../utils/httpError');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const schemas = require('../utils/validation/transactionSchemas');
const { plan } = require('../services/transactionQuery');
const { ownerWhere, createOwner, preserveOwner, assertUserPath } = require('../utils/access');
const { fromCents, toCents } = require('../utils/money');
const includes = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'icon'], required: false },
  { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false },
];
const serialize = (value) => {
  const t = value.toJSON ? value.toJSON() : value;
  return {
    id_transaction: t.id_transaction,
    id_user: t.id_user,
    id_category: t.id_category,
    type: t.type,
    nominal: fromCents(toCents(t.nominal)),
    catatan: t.catatan,
    createdAt: new Date(t.createdAt).toISOString(),
    updatedAt: new Date(t.updatedAt).toISOString(),
    category: t.category
      ? { id: t.category.id, name: t.category.name, icon: t.category.icon }
      : null,
    user: t.user ? { id: t.user.id, name: t.user.name, email: t.user.email } : null,
  };
};
const owned = async (req, options = {}) => {
  const row = await Transaction.findOne({
    where: { id_transaction: parse(idSchema, req.params.id), ...ownerWhere(req) },
    ...options,
  });
  if (!row) throw httpError(404, 'Transaksi tidak ditemukan');
  return row;
};
const references = async (userId, categoryId, transaction) => {
  if (
    !(await User.findByPk(userId, { transaction })) ||
    !(await Category.findByPk(categoryId, { transaction }))
  )
    throw httpError(404, 'User atau kategori tidak ditemukan');
};
const createTransaction = async (req, res) => {
  const value = parse(schemas.create, req.body);
  value.id_user = createOwner(req, value);
  await references(value.id_user, value.id_category);
  const row = await Transaction.create(value);
  const full = await Transaction.findByPk(row.id_transaction, { include: includes });
  res
    .location(`/api/v1/transactions/${row.id_transaction}`)
    .status(201)
    .json({ success: true, data: serialize(full) });
};
const listTransactions = async (req, res, forcedMode, parentType) => {
  const extra = {};
  if (parentType) {
    const id = parse(idSchema, req.params.id);
    if (parentType === 'user') assertUserPath(req, id);
    if (!(await (parentType === 'user' ? User : Category).findByPk(id)))
      throw httpError(404, 'Data tidak ditemukan');
    extra[parentType === 'user' ? 'id_user' : 'id_category'] = id;
  }
  const p = plan(req, extra),
    { q } = p;
  let rows, total;
  if ((forcedMode || q.mode) === 'raw') {
    const count = await sequelize.query(
      `SELECT COUNT(*) AS total FROM transactions t ${p.sqlWhere}`,
      { replacements: p.replacements, type: QueryTypes.SELECT },
    );
    total = Number(count[0].total);
    const sortColumn = {
      createdAt: 't.createdAt',
      nominal: 't.nominal',
      id_transaction: 't.id_transaction',
    }[q.sort_by];
    const direction = { asc: 'ASC', desc: 'DESC' }[q.sort];
    rows = await sequelize.query(
      `SELECT t.*, c.id AS category_id, c.name AS category_name,c.icon AS category_icon,u.id AS user_id,u.name AS user_name,u.email AS user_email
            FROM transactions t LEFT JOIN categories c ON c.id=t.id_category LEFT JOIN users u ON u.id=t.id_user AND u.deletedAt IS NULL
            ${p.sqlWhere} ORDER BY ${sortColumn} ${direction},t.id_transaction ${direction} LIMIT :limit OFFSET :offset`,
      {
        replacements: { ...p.replacements, limit: q.limit, offset: q.offset },
        type: QueryTypes.SELECT,
      },
    );
    rows = rows.map((t) => ({
      ...t,
      category:
        t.category_id == null
          ? null
          : { id: t.category_id, name: t.category_name, icon: t.category_icon },
      user: t.user_id == null ? null : { id: t.user_id, name: t.user_name, email: t.user_email },
    }));
  } else {
    const result = await Transaction.findAndCountAll({
      where: p.where,
      include: includes,
      order: [
        [q.sort_by, q.sort.toUpperCase()],
        ['id_transaction', q.sort.toUpperCase()],
      ],
      limit: q.limit,
      offset: q.offset,
    });
    rows = result.rows;
    total = result.count;
  }
  res.json({
    success: true,
    meta: {
      total,
      count: rows.length,
      limit: q.limit,
      offset: q.offset,
      page: Math.floor(q.offset / q.limit) + 1,
      sort: q.sort,
      sort_by: q.sort_by,
    },
    data: rows.map(serialize),
  });
};
const getTransactionById = async (req, res) =>
  res.json({ success: true, data: serialize(await owned(req, { include: includes })) });
const save = async (req, res, partial) => {
  const value = parse(partial ? schemas.patch : schemas.put, req.body);
  const result = await sequelize.transaction(async (transaction) => {
    const row = await owned(req, { transaction, lock: transaction.LOCK.UPDATE });
    preserveOwner(value, row.id_user);
    await references(row.id_user, value.id_category || row.id_category, transaction);
    await row.update(value, { transaction });
    return Transaction.findByPk(row.id_transaction, { include: includes, transaction });
  });
  res.json({ success: true, data: serialize(result) });
};
const deleteTransaction = async (req, res) => {
  const row = await owned(req);
  await row.destroy();
  res.status(204).send();
};
const getCashFlow = async (req, res) => {
  const p = plan(req);
  const [row] = await sequelize.query(
    `SELECT COALESCE(SUM(CASE WHEN t.type='income' THEN t.nominal ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN t.type='expense' THEN t.nominal ELSE 0 END),0) AS expense,COUNT(*) AS total_transactions
        FROM transactions t ${p.sqlWhere}`,
    { replacements: p.replacements, type: QueryTypes.SELECT },
  );
  const income = toCents(row.income),
    expense = toCents(row.expense);
  res.json({
    success: true,
    data: {
      label: 'Arus kas tercatat',
      income: fromCents(income),
      expense: fromCents(expense),
      difference: fromCents(income - expense),
      total_transactions: Number(row.total_transactions),
      timezone: 'Asia/Jakarta',
      filters: {
        period: p.q.period || null,
        start_date: p.q.start_date || null,
        end_date: p.q.end_date || null,
        type: p.q.type || null,
        category_id: p.q.category_id || null,
        search: p.q.search,
      },
    },
  });
};
module.exports = {
  createTransaction,
  getTransactionById,
  deleteTransaction,
  getCashFlow,
  getTransactions: (req, res) => listTransactions(req, res),
  getTransactionsORM: (req, res) => listTransactions(req, res, 'orm'),
  getTransactionsRaw: (req, res) => listTransactions(req, res, 'raw'),
  getTransactionsByUser: (req, res) => listTransactions(req, res, null, 'user'),
  getTransactionsByCategory: (req, res) => listTransactions(req, res, null, 'category'),
  replaceTransaction: (req, res) => save(req, res, false),
  updateTransaction: (req, res) => save(req, res, true),
};
