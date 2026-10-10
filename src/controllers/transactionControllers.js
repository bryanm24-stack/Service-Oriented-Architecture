const { Op, QueryTypes } = require("sequelize");
const { Transaction, Category, User, sequelize } = require("../models");
const { parse, idSchema, transactionCreate, transactionPatch, transactionQuery } = require("../utils/validation/resourceSchemas");

const transactionFields = ["id_transaction", "id_category", "id_user", "nominal", "catatan", "createdAt", "updatedAt"];
const includes = [
    {
        model: Category,
        as: "category",
        attributes: ["id", "name", "icon"],
        required: false
    },
    {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
        required: false
    },
];

// Samakan kontrak hasil ORM dan RAW, termasuk DECIMAL dan user soft-deleted.
const serialize = item => {
    const row = typeof item.toJSON === "function" ? item.toJSON() : item;

    return {
        id_transaction: row.id_transaction,
        id_category: row.id_category,
        id_user: row.id_user,
        nominal: String(row.nominal),
        catatan: row.catatan,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        category: row.category ? {
            id: row.category.id,
            name: row.category.name,
            icon: row.category.icon
        } : null,
        user: row.user ? {
            id: row.user.id,
            name: row.user.name,
            email: row.user.email
        } : null,
    };
};

const createTransaction = async (req, res) => {
    const value = parse(transactionCreate, req.body);

    if (!await Category.findByPk(value.id_category)) {
        return res.status(404).json({
            message: "Category tidak ditemukan"
        });
    }

    if (!await User.findByPk(value.id_user)) {
        return res.status(404).json({
            message: "User tidak ditemukan"
        });
    }

    const transaction = await Transaction.create(value);

    res.location(`/api/v1/transactions/${transaction.id_transaction}`).status(201).json({
        success: true,
        message: "Transaction berhasil dibuat",
        data: transaction,
    });
};

const listTransactions = async (req, res, forcedMode) => {
    const query = parse(transactionQuery, req.query);
    const { search, sort, limit, offset, minNominal, maxNominal } = query;

    if (minNominal !== undefined && maxNominal !== undefined && Number(minNominal) > Number(maxNominal)) {
        return res.status(400).json({
            message: "minNominal tidak boleh melebihi maxNominal"
        });
    }

    let categoryId;

    if (req.params.id !== undefined) {
        categoryId = parse(idSchema, req.params.id);

        if (!await Category.findByPk(categoryId)) {
            return res.status(404).json({
                message: "Category tidak ditemukan"
            });
        }
    }

    const mode = forcedMode || query.mode;
    let rows;

    if (mode === "raw") {
        const clauses = [];
        const replacements = {
            limit,
            offset
        };

        if (search) {
            clauses.push("t.catatan LIKE :search");

            replacements.search = `%${search}%`;
        }

        if (categoryId !== undefined) {
            clauses.push("t.id_category = :categoryId");

            replacements.categoryId = categoryId;
        }

        if (minNominal !== undefined) {
            clauses.push("t.nominal >= :minNominal");

            replacements.minNominal = minNominal;
        }

        if (maxNominal !== undefined) {
            clauses.push("t.nominal <= :maxNominal");

            replacements.maxNominal = maxNominal;
        }

        // sort sudah dibatasi Joi menjadi asc/desc; nilai lain memakai replacements.
        const sql = `SELECT t.id_transaction, t.id_category, t.id_user, t.nominal,
      t.catatan, t.createdAt, t.updatedAt,
      c.id AS category_id, c.name AS category_name, c.icon AS category_icon,
      u.id AS user_id, u.name AS user_name, u.email AS user_email
      FROM transactions AS t
      LEFT JOIN categories AS c ON c.id = t.id_category
      LEFT JOIN users AS u ON u.id = t.id_user AND u.deletedAt IS NULL
      ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""}
      ORDER BY t.nominal ${sort.toUpperCase()}, t.id_transaction ASC
      LIMIT :limit OFFSET :offset`;
        const raw = await sequelize.query(sql, {
            replacements,
            type: QueryTypes.SELECT
        });

        rows = raw.map(row => ({
            ...row,
            category: row.category_id == null ? null : {
                id: row.category_id,
                name: row.category_name,
                icon: row.category_icon
            },
            user: row.user_id == null ? null : {
                id: row.user_id,
                name: row.user_name,
                email: row.user_email
            },
        }));
    } else {
        const where = {};

        if (search) {
            where.catatan = {
                [Op.like]: `%${search}%`
            };
        }

        if (categoryId !== undefined) {
            where.id_category = categoryId;
        }

        if (minNominal !== undefined || maxNominal !== undefined) {
            where.nominal = {};

            if (minNominal !== undefined) {
                where.nominal[Op.gte] = minNominal;
            }

            if (maxNominal !== undefined) {
                where.nominal[Op.lte] = maxNominal;
            }
        }

        rows = await Transaction.findAll({
            attributes: transactionFields,
            where,
            include: includes,
            order: [["nominal", sort.toUpperCase()], ["id_transaction", "ASC"]],
            limit,
            offset,
        });
    }

    res.json({
        success: true,
        meta: {
            search,
            sort,
            limit,
            offset,
            count: rows.length
        },
        data: rows.map(serialize)
    });
};

const getTransactions = (req, res) => listTransactions(req, res);

const getTransactionsORM = (req, res) => listTransactions(req, res, "orm");

const getTransactionsRaw = (req, res) => listTransactions(req, res, "raw");

const getTransactionsByCategory = (req, res) => listTransactions(req, res);

const updateTransaction = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const value = parse(transactionPatch, req.body);
    const transaction = await Transaction.findByPk(id);

    if (!transaction) {
        return res.status(404).json({
            message: "Transaction tidak ditemukan"
        });
    }

    await transaction.update(value);

    res.json({
        success: true,
        data: transaction
    });
};

const deleteTransaction = async (req, res) => {
    const transaction = await Transaction.findByPk(parse(idSchema, req.params.id));

    if (!transaction) {
        return res.status(404).json({
            message: "Transaction tidak ditemukan"
        });
    }

    await transaction.destroy();

    res.json({
        success: true,
        message: "Transaction berhasil dihapus"
    });
};

module.exports = {
    createTransaction,
    getTransactions,
    getTransactionsORM,
    getTransactionsRaw,
    getTransactionsByCategory,
    updateTransaction,
    deleteTransaction
};
