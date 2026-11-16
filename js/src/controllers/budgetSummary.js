const { ownerWhere } = require('../utils/access');
const { QueryTypes } = require('sequelize');
const { Budget, Category, sequelize } = require('../models');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const { toCents, fromCents } = require('../utils/money');
const httpError = require('../utils/httpError');

const getBudgetSummary = async (req, res) => {
  const id = parse(idSchema, req.params.id);
  const budget = await Budget.findOne({
    where: { budget_id: id, ...ownerWhere(req, 'user_id') },
    include: [{ model: Category, as: 'categories', through: { attributes: ['allocated_amount'] } }],
  });

  if (!budget) throw httpError(404, 'Budget tidak ditemukan');

  // Satu agregasi untuk semua kategori user dalam periode Budget, tanpa query per kategori.
  const spending = await sequelize.query(
    `SELECT id_category, SUM(nominal) AS spent
         FROM transactions
         WHERE id_user = $userId AND type = 'expense' AND createdAt >= $start AND createdAt < $end
         GROUP BY id_category`,
    {
      bind: {
        userId: budget.user_id,
        start: new Date(`${budget.year}-${String(budget.month).padStart(2, '0')}-01T00:00:00+07:00`)
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
        end: new Date(Date.UTC(budget.year, budget.month, 1, -7))
          .toISOString()
          .slice(0, 19)
          .replace('T', ' '),
      },
      type: QueryTypes.SELECT,
    },
  );
  const spentByCategory = new Map(
    spending.map((row) => [Number(row.id_category), toCents(row.spent)]),
  );
  let totalAllocated = 0n;
  let totalSpent = 0n;
  const categories = budget.categories.map((category) => {
    const allocated = toCents(category.Budget_categories.allocated_amount);
    const spent = spentByCategory.get(category.id) || 0n;
    totalAllocated += allocated;
    totalSpent += spent;

    return {
      category_id: category.id,
      name: category.name,
      allocated_amount: fromCents(allocated),
      spent: fromCents(spent),
      remaining: fromCents(allocated - spent),
      over_budget: spent > allocated,
    };
  });

  return res.json({
    status: 'success',
    data: {
      budget_id: budget.budget_id,
      user_id: budget.user_id,
      month: budget.month,
      year: budget.year,
      basis: 'Expense tercatat, Asia/Jakarta; hanya kategori yang dialokasikan pada Budget',
      total_allocated: fromCents(totalAllocated),
      total_spent: fromCents(totalSpent),
      total_remaining: fromCents(totalAllocated - totalSpent),
      categories,
    },
  });
};

module.exports = { getBudgetSummary };
