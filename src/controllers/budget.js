const { Op } = require('sequelize');
const { Budget, BudgetCategory, User, Category, sequelize } = require('../models');
const { budgetBody, budgetId, budgetListQuery } = require('../utils/validation/budgetSchemas');
const { parse } = require('../utils/validation/resourceSchemas');
const httpError = require('../utils/httpError');

const budgetInclude = [
    {
        model: Category,
        as: 'categories',
        attributes: ['id', 'name', 'icon'],
        through: {
            attributes: ['allocated_amount']
        },
        required: false
    }
];

const joinedBudget = (id, transaction) => Budget.findByPk(id, {
    include: budgetInclude,
    transaction
});

const checkReferences = async (value, transaction) => {
    const user = await User.findByPk(value.user_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!user) {
        throw httpError(404, 'User aktif tidak ditemukan');
    }

    const ids = value.budget_categories.map(item => item.category_id);
    const categories = await Category.findAll({
        attributes: ['id'],
        where: {
            id: {
                [Op.in]: ids
            }
        },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (categories.length !== ids.length) {
        throw httpError(404, 'Satu atau lebih kategori tidak ditemukan');
    }
};

const checkPeriod = async (value, transaction, excludedId) => {
    const where = {
        user_id: value.user_id,
        month: value.month,
        year: value.year
    };

    if (excludedId !== undefined) {
        where.budget_id = {
            [Op.ne]: excludedId
        };
    }

    const duplicate = await Budget.findOne({ where, transaction });

    if (duplicate) {
        throw httpError(409, 'Budget untuk user dan periode tersebut sudah ada');
    }

    // UNIQUE SQL tetap menjadi perlindungan akhir jika ada request bersamaan.
};

const createAllocations = async (id, categories, transaction) => {
    const values = categories.map(item => ({
        budget_id: id,
        category_id: item.category_id,
        allocated_amount: item.allocated_amount
    }));

    await BudgetCategory.bulkCreate(values, {
        transaction,
        validate: true
    });
};

const createBudget = async (req, res) => {
    const value = parse(budgetBody, req.body);
    const created = await sequelize.transaction(async transaction => {
        await checkReferences(value, transaction);
        await checkPeriod(value, transaction);

        const budget = await Budget.create({
            user_id: value.user_id,
            month: value.month,
            year: value.year
        }, { transaction });

        await createAllocations(budget.budget_id, value.budget_categories, transaction);

        return joinedBudget(budget.budget_id, transaction);
    });

    return res.location(`/api/v1/budgets/${created.budget_id}`)
        .status(201)
        .json({ status: 'success', data: created });
};

const getAllBudgets = async (req, res) => {
    const value = parse(budgetListQuery, req.query);
    const where = {};

    if (value.user_id !== undefined) {
        where.user_id = value.user_id;
    }

    // Satu SELECT dengan JOIN. Tidak ada query kategori di dalam loop.
    const budgets = await Budget.findAll({
        where,
        include: budgetInclude,
        order: [['budget_id', 'ASC']]
    });

    return res.json({ status: 'success', data: budgets });
};

const getBudgetById = async (req, res) => {
    const id = parse(budgetId, req.params.id);
    const budget = await joinedBudget(id);

    if (!budget) {
        throw httpError(404, 'Budget tidak ditemukan');
    }

    return res.json({ status: 'success', data: budget });
};

const updateBudget = async (req, res) => {
    const id = parse(budgetId, req.params.id);
    const value = parse(budgetBody, req.body);
    const updated = await sequelize.transaction(async transaction => {
        const budget = await Budget.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!budget) {
            throw httpError(404, 'Budget tidak ditemukan');
        }

        await checkReferences(value, transaction);
        await checkPeriod(value, transaction, id);

        await budget.update({
            user_id: value.user_id,
            month: value.month,
            year: value.year
        }, { transaction });

        // PUT mengganti seluruh daftar alokasi secara atomik.
        await BudgetCategory.destroy({
            where: { budget_id: id },
            transaction
        });

        await createAllocations(id, value.budget_categories, transaction);

        return joinedBudget(id, transaction);
    });

    return res.json({ status: 'success', data: updated });
};

const deleteBudget = async (req, res) => {
    const id = parse(budgetId, req.params.id);

    await sequelize.transaction(async transaction => {
        const budget = await Budget.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!budget) {
            throw httpError(404, 'Budget tidak ditemukan');
        }

        await BudgetCategory.destroy({
            where: { budget_id: id },
            transaction
        });

        await budget.destroy({ transaction });
    });

    return res.status(204).send();
};

module.exports = {
    createBudget,
    getAllBudgets,
    getBudgetById,
    updateBudget,
    deleteBudget
};
