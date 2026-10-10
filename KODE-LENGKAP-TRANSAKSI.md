# Kode lengkap Transactions pada proyek gabungan

Versi terintegrasi. Jalankan npm start; SQL aktif sql/Gabungan.sql. Petunjuk lengkap: MULAI-DI-SINI.md.

## src/models/Transaction.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Transaction = sequelize.define(
    'Transaction',
    {
        id_transaction: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        id_category: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false
        },
        id_user: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        nominal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            validate: {
                min: 0
            }
        },
        catatan: {
            type: DataTypes.TEXT,
            allowNull: true
        },
    },
    {
        tableName: "transactions",
        timestamps: true
    }
);

module.exports = Transaction;

```

## src/models/User.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 255]
            },
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: "Format email tidak valid"
                }
            },
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                len: {
                    args: [8, 255],
                    msg: "Password tersimpan harus 8-255 karakter"
                }
            },
        },
        profile_info: {
            type: DataTypes.VIRTUAL,
            get() {
                return `${this.name} (${this.email})`;
            },
        },
    },
    {
        tableName: "users",
        timestamps: true,
        paranoid: true,
        defaultScope: {
            attributes: {
                exclude: ["password"]
            }
        }
    }
);

module.exports = User;

```

## src/models/Category.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [1, 100]
            },
            set(value) {
                this.setDataValue("name", typeof value === "string"
                ? value.trim().replace(/\s+/g, " ") : value);
            },
        },
        icon: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        formatted_name: {
            type: DataTypes.VIRTUAL,
            get() {
                const name = this.getDataValue("name");

                return name ? name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : null;
            },
        },
    },
    {
        tableName: "categories",
        timestamps: true,
        defaultScope: {
            attributes: {
                exclude: ["createdAt", "updatedAt"]
            }
        }
    }
);

module.exports = Category;

```

## src/models/index.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const User = require('./User');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Budget = require('./Budget');
const BudgetCategory = require('./Budget_categories');

const db = {
    Buku: require('./Buku')(sequelize, DataTypes),
    Karakter: require('./Karakter')(sequelize, DataTypes),
    User,
    Category,
    Transaction,
    Budget,
    BudgetCategory,
    Budget_categories: BudgetCategory
};

// Buku dan Karakter mempertahankan pola factory dari materi.
for (const model of [db.Buku, db.Karakter]) {
    if (typeof model.associate === 'function') {
        model.associate(db);
    }
}

// Seluruh model sudah tersedia sebelum relasi dipasang.

User.hasMany(db.Transaction, {
    foreignKey: "id_user",
    as: "transactions",
    onDelete: "RESTRICT",
});

Category.hasMany(db.Transaction, {
    foreignKey: "id_category",
    as: "transactions",
    onDelete: "RESTRICT",
});

Transaction.belongsTo(db.Category, {
    foreignKey: "id_category",
    as: "category",
    onDelete: "RESTRICT",
});

Transaction.belongsTo(db.User, {
    foreignKey: "id_user",
    as: "user",
    onDelete: "RESTRICT",
});

Budget.belongsTo(db.User, {
    foreignKey: 'user_id',
    as: 'user',
    onDelete: 'RESTRICT'
});

db.User.hasMany(Budget, {
    foreignKey: 'user_id',
    as: 'budgets',
    onDelete: 'RESTRICT'
});

Budget.belongsToMany(db.Category, {
    through: BudgetCategory,
    foreignKey: 'budget_id',
    otherKey: 'category_id',
    as: 'categories',
    onDelete: 'CASCADE'
});

db.Category.belongsToMany(Budget, {
    through: BudgetCategory,
    foreignKey: 'category_id',
    otherKey: 'budget_id',
    as: 'budgets',
    onDelete: 'RESTRICT'
});

db.sequelize = sequelize;

module.exports = db;

```

## src/controllers/transactionControllers.js

```javascript
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

```

## src/controllers/category.js

```javascript
const { Category, Transaction } = require("../models");
const { parse, idSchema, categoryCreate, categoryPatch } = require("../utils/validation/resourceSchemas");

const createCategory = async (req, res) => {
    const category = await Category.create(parse(categoryCreate, req.body));

    res.location(`/api/v1/categories/${category.id}`).status(201).json({
        msg: "Category berhasil dibuat",
        data: category
    });
};

const getCategories = async (req, res) => {
    res.json({
        data: await Category.findAll({
            order: [["id", "ASC"]]
        })
    });
};

const getCategoryById = async (req, res) => {
    const category = await Category.findByPk(parse(idSchema, req.params.id));

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    res.json({
        data: category
    });
};

const updateCategory = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const value = parse(categoryPatch, req.body);
    const category = await Category.findByPk(id);

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    await category.update(value);

    res.json({
        msg: "Category berhasil diperbarui",
        data: category
    });
};

const deleteCategory = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const category = await Category.findByPk(id);

    if (!category) {
        return res.status(404).json({
            msg: "Category tidak ditemukan"
        });
    }

    if (await Transaction.count({
        where: {
            id_category: id
        }
    })) {
        return res.status(409).json({
            msg: "Category masih memiliki transaksi"
        });
    }

    // FK RESTRICT juga menjaga kondisi balapan dengan transaksi baru.
    await category.destroy();

    res.status(204).send();
};

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
};

```

## src/routes/transactionRoutes.js

```javascript
const router = require("express").Router();
const controller = require("../controllers/transactionControllers");
const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const { convertTransaction } = require('../controllers/transactionConversion');

router.route('/transactions/:id/conversion')
.get(asyncHandler(convertTransaction))
.all(methodNotAllowed('GET'));

// Router ini dipasang pada /api/v1, karena mencakup dua resource path.
router.route("/transactions")
.get(asyncHandler(controller.getTransactions))
.post(asyncHandler(controller.createTransaction))
.all(methodNotAllowed("GET", "POST"));

router.route("/categories/:id/transactions")
.get(asyncHandler(controller.getTransactionsByCategory))
.all(methodNotAllowed("GET"));

router.route("/transactions/:id")
.patch(asyncHandler(controller.updateTransaction))
.delete(asyncHandler(controller.deleteTransaction))
.all(methodNotAllowed("PATCH", "DELETE"));

module.exports = router;

```

## src/routes/index.js

```javascript
module.exports = {
    budgetRouter: require("./budget"),
    contohRouter: require("./contoh"),
    bukuRouter: require("./buku"),
    axiosRouter: require("./contohAxios"),
    categoryRouter: require("./category"),
    userRouter: require("./userRoutes"),
    transactionRouter: require("./transactionRoutes"),
};

```

## index.js

```javascript
require("dotenv").config();

const express = require("express");
const app = express();
const routes = require("./src/routes");
const { testConnection } = require("./src/databases/connection");

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(require("./src/middlewares/logger"));

app.get("/", (req, res) => res.json({
    service: "SOA Asisten Keuangan",
    version: "1.0.0",
    endpoints: ["/api/v1/users", "/api/v1/categories", "/api/v1/transactions", "/api/v1/budgets",
    "/api/v1/contoh", "/api/v1/buku", "/api/v1/contohAxios"],
}));

app.use("/api/v1", routes.transactionRouter);

app.use("/api/v1/users", routes.userRouter);

app.use("/api/v1/categories", routes.categoryRouter);

app.use("/api/v1/budgets", routes.budgetRouter);

app.use("/api/v1/contoh", routes.contohRouter);

app.use("/api/v1/buku", routes.bukuRouter);

app.use("/api/v1/contohAxios", routes.axiosRouter);

app.use(require("./src/middlewares/notFound"));

app.use(require("./src/middlewares/errorHandler"));

if (require.main === module) {
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
        console.log(`Server berjalan di port ${port}`);

        testConnection();
    });
}

module.exports = app;

```

## src/utils/validation/resourceSchemas.js

```javascript
const Joi = require("joi");

const positiveId = Joi.number()
    .integer()
    .min(1)
    .max(2147483647)
    .messages({
        "any.required": "{#label} wajib diisi",
        "any.only": "{#label} harus salah satu dari {#valids}",
        "any.invalid": "{#label} tidak valid",
        "number.base": "{#label} harus berupa angka",
        "number.integer": "{#label} harus berupa bilangan bulat",
        "number.min": "{#label} minimal {#limit}",
        "number.max": "{#label} maksimal {#limit}",
        "number.positive": "{#label} harus lebih dari nol",
        "number.unsafe": "{#label} melebihi batas angka aman"
    });

const idSchema = positiveId.required().label("id");

const userFields = {
    name: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .label("name")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    email: Joi.string()
        .trim()
        .email()
        .max(255)
        .label("email")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    password: Joi.string()
        .min(8)
        .max(100)
        .label("password")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
};

const userCreate = Joi.object({
    name: userFields.name.required(),
    email: userFields.email.required(),
    password: userFields.password.required()
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const userPatch = Joi.object(userFields)
    .min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const categoryFields = {
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .label("name")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    icon: Joi.string()
        .trim()
        .max(255)
        .allow(null, "")
        .label("icon")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
};

const categoryCreate = Joi.object({
    ...categoryFields,
    name: categoryFields.name.required()
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const categoryPatch = Joi.object(categoryFields)
    .min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

// Batas nominal sesuai DECIMAL(15, 2). Pertahankan kontrak angka/teks angka.
const amount = Joi.alternatives()
    .try(
        Joi.number().min(0).max(9999999999999.99),
        Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/)
    )
    .custom((value, helpers) => {
        if (/^\d{1,13}(\.\d{1,2})?$/.test(String(value))) {
            return value;
        }

        return helpers.error("any.invalid");
    })
    .messages({
        "any.required": "{#label} wajib diisi",
        "any.invalid": "{#label} tidak valid",
        "alternatives.match": "{#label} memiliki format yang tidak valid",
        "alternatives.types": "{#label} harus berupa angka atau teks angka",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} minimal {#limit}",
        "number.max": "{#label} maksimal {#limit}",
        "number.unsafe": "{#label} melebihi batas angka aman",
        "string.pattern.base": "{#label} memiliki format yang tidak valid",
        "string.empty": "{#label} tidak boleh kosong"
    });

const transactionCreate = Joi.object({
    id_category: positiveId.required().label("id_category"),
    id_user: positiveId.required().label("id_user"),
    nominal: amount.required().label("nominal"),

    catatan: Joi.string()
        .max(10000)
        .allow(null, "")
        .label("catatan")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const transactionPatch = Joi.object({
    nominal: amount.label("nominal"),

    catatan: Joi.string()
        .max(10000)
        .allow(null, "")
        .label("catatan")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
}).min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const transactionQuery = Joi.object({
    search: Joi.string()
        .allow("")
        .max(255)
        .default("")
        .label("search")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    sort: Joi.string()
        .lowercase()
        .valid("asc", "desc")
        .default("asc")
        .label("sort")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .label("limit")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    offset: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .label("offset")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    minNominal: amount.label("minNominal"),

    maxNominal: amount.label("maxNominal"),

    mode: Joi.string()
        .valid("orm", "raw")
        .default("orm")
        .label("mode")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const userQuery = Joi.object({
    search: Joi.string()
        .allow("")
        .max(255)
        .default("")
        .label("search")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    sort: Joi.string()
        .valid("id", "name", "email", "createdAt")
        .default("id")
        .label("sort")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10)
        .label("limit")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    offset: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .label("offset")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

// Dipakai controller Users, Categories, Transactions, dan integrasi API.
// Kontrak tetap: kembalikan value, atau lempar error 400 ke errorHandler.
const parse = (schema, input) => {
    const { error, value } = schema.required().validate(input, {
        abortEarly: false,
        errors: {
            label: "path"
        }
    });

    if (error) {
        const failure = new Error("Validasi gagal");

        failure.status = 400;
        failure.details = error.details.map(item => ({
            field: item.path.join(".") || "_schema",
            message: item.message
        }));

        throw failure;
    }

    return value;
};

module.exports = {
    parse,
    idSchema,
    userCreate,
    userPatch,
    userQuery,
    categoryCreate,
    categoryPatch,
    transactionCreate,
    transactionPatch,
    transactionQuery
};

```

## src/databases/connection.js

```javascript
require("dotenv").config();

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME || "asisten_keuangan",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "",
    {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        dialect: "mysql",
        logging: process.env.SQL_LOG === "true" ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            idle: 10000
        },
        define: {
            freezeTableName: true
        },
    }
);

const testConnection = async () => {
    try {
        await sequelize.authenticate();

        console.log("[DB] Koneksi MySQL berhasil.");
    } catch (error) {
        console.error("[DB] Koneksi gagal. Periksa MySQL dan .env.");
    }
};

module.exports = {
    sequelize,
    testConnection
};

```

## config/database.js

```javascript
// Alias kompatibilitas: tidak membuat instance/koneksi kedua.
module.exports = require("../src/databases/connection").sequelize;

```

## src/utils/asyncHandler.js

```javascript
const asyncHandler = handler => (req, res, next) => {
    Promise.resolve()
    .then(() => handler(req, res, next))
    .catch(next);
};

module.exports = asyncHandler;

```

## src/middlewares/errorHandler.js

```javascript
module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const code = err.original?.code || err.parent?.code || err.code;

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            msg: 'Body bukan JSON yang valid'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            msg: 'Body melebihi batas ukuran'
        });
    }

    if (err.name === 'SequelizeUniqueConstraintError' || code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            msg: 'Data dengan nilai unik tersebut sudah ada'
        });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({
            msg: 'Data masih digunakan atau referensi tidak tersedia'
        });
    }

    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            msg: 'Validasi gagal',
            errors: err.errors.map(item => ({
                field: item.path || '_model',
                message: `${item.path || '_model'} tidak valid`
            }))
        });
    }

    if (err.status === 400 && Array.isArray(err.details)) {
        return res.status(400).json({
            msg: 'Validasi gagal',
            errors: err.details
        });
    }

    if (err.expose === true && [400, 404, 409, 502, 503, 504].includes(err.status)) {
        return res.status(err.status).json({
            msg: err.message
        });
    }

    if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR'].includes(code)
    || err.name?.startsWith('SequelizeConnection')) {
        return res.status(503).json({
            msg: 'Database belum dapat dihubungi'
        });
    }

    console.error('[ERROR] Kesalahan internal server');

    return res.status(500).json({
        msg: 'Terjadi kesalahan pada server'
    });
};

```

## src/middlewares/methodNotAllowed.js

```javascript
// Pasang melalui .all() SETELAH handler metode yang diizinkan.
module.exports = (...allowed) => (req, res) =>
res.set("Allow", allowed.join(", ")).status(405).json({
    msg: `Method ${req.method} tidak diizinkan untuk endpoint ini`,
    allowed,
});

```

## sql/Gabungan.sql

```sql
-- DATABASE GABUNGAN
-- Revisi: Transactions 1:N, tambahan Budget dan pivot N:M.
-- Semua tabel dan seed materi lama dipertahankan.
-- CREATE TABLE IF NOT EXISTS tidak mengubah struktur tabel yang sudah ada.
-- Jalankan pada database yang sama dengan DB_NAME di .env.
-- Impor manual memakai asisten_keuangan; npm run db:migrate mengikuti DB_NAME.
-- Tabel yang sudah ada dan data lama tidak dihapus atau ditimpa.

-- BEGIN DATABASE SELECTION
CREATE DATABASE IF NOT EXISTS `asisten_keuangan` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `asisten_keuangan`;
-- END DATABASE SELECTION

-- ============================================================
-- 1. STRUKTUR TABEL
-- ============================================================

CREATE TABLE IF NOT EXISTS buku (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul         VARCHAR(150) NOT NULL,
  penulis       VARCHAR(100) NOT NULL,
  tahun_terbit  SMALLINT UNSIGNED NOT NULL,
  harga         INT UNSIGNED NOT NULL,
  stok          INT UNSIGNED NOT NULL DEFAULT 0,
  kategori      ENUM('novel', 'komik', 'non-fiksi', 'referensi') NOT NULL,

  createdAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,
  deletedAt     DATETIME NULL DEFAULT NULL,

  UNIQUE KEY uq_buku_judul (judul)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS karakter (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  buku_id   INT UNSIGNED NOT NULL,
  nama      VARCHAR(100) NOT NULL,
  peran     VARCHAR(50) NOT NULL,

  CONSTRAINT fk_karakter_buku
    FOREIGN KEY (buku_id) REFERENCES buku(id)
    ON DELETE CASCADE,

  INDEX idx_karakter_buku_id (buku_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS penulis (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  negara        VARCHAR(100) NOT NULL,
  tahun_lahir   SMALLINT UNSIGNED NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deletedAt DATETIME NULL DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,

    icon VARCHAR(255) NULL,

    createdAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    updatedAt DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id_transaction INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_category INT UNSIGNED NOT NULL,
  id_user INT NOT NULL,
  nominal DECIMAL(15, 2) NOT NULL,
  catatan TEXT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_transactions_category FOREIGN KEY (id_category)
    REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_user FOREIGN KEY (id_user)
    REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_transactions_category (id_category),
  INDEX idx_transactions_user (id_user),
  INDEX idx_transactions_nominal (nominal)
) ENGINE=InnoDB;

-- ============================================================
-- TABEL BUDGET DAN PIVOT (modul Rafael aktif)
-- user_id memakai INT signed, sama dengan users.id.
-- Model Budget aktif sudah memakai tipe FK yang sama dengan tabel users.
-- ============================================================

CREATE TABLE IF NOT EXISTS budget (
    budget_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    month INT UNSIGNED NOT NULL,
    year INT UNSIGNED NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_user_period (user_id, month, year)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS budget_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    budget_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    allocated_amount DECIMAL(10, 2) NOT NULL,

    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_budget_categories_budget
        FOREIGN KEY (budget_id) REFERENCES budget(budget_id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_budget_categories_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    UNIQUE KEY uq_budget_category (budget_id, category_id),
    INDEX idx_budget_categories_category (category_id)
) ENGINE=InnoDB;

-- ============================================================
-- 2. DATA AWAL
-- ============================================================

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Jojo''s Bizarre Adventure', 'Hirohiko Araki', 1987, 120000, 8, 'komik'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Jojo''s Bizarre Adventure');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Harry Potter and the Philosopher''s Stone', 'J.K. Rowling', 1997, 95000, 15, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Harry Potter and the Philosopher''s Stone');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Laskar Pelangi', 'Andrea Hirata', 2005, 78000, 0, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Laskar Pelangi');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, 110000, 4, 'novel'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Bumi Manusia');

INSERT INTO buku (judul, penulis, tahun_terbit, harga, stok, kategori)
SELECT 'Filosofi Teras', 'Henry Manampiring', 2018, 88000, 22, 'non-fiksi'
WHERE NOT EXISTS (SELECT 1 FROM buku WHERE judul = 'Filosofi Teras');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Jotaro Kujo', 'protagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Jotaro Kujo' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Dio Brando', 'antagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Dio Brando' AND k.peran = 'antagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Giorno Giovanna', 'protagonis' FROM buku AS b
WHERE b.judul = 'Jojo''s Bizarre Adventure'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Giorno Giovanna' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Harry Potter', 'protagonis' FROM buku AS b
WHERE b.judul = 'Harry Potter and the Philosopher''s Stone'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Harry Potter' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Hermione Granger', 'protagonis' FROM buku AS b
WHERE b.judul = 'Harry Potter and the Philosopher''s Stone'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Hermione Granger' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Ikal', 'protagonis' FROM buku AS b
WHERE b.judul = 'Laskar Pelangi'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Ikal' AND k.peran = 'protagonis');

INSERT INTO karakter (buku_id, nama, peran)
SELECT b.id, 'Minke', 'protagonis' FROM buku AS b
WHERE b.judul = 'Bumi Manusia'
AND NOT EXISTS (SELECT 1 FROM karakter AS k WHERE k.buku_id = b.id AND k.nama = 'Minke' AND k.peran = 'protagonis');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Hirohiko Araki', 'Jepang', 1960
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Hirohiko Araki');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'J.K. Rowling', 'Inggris', 1965
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'J.K. Rowling');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Andrea Hirata', 'Indonesia', 1967
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Andrea Hirata');

INSERT INTO penulis (nama, negara, tahun_lahir)
SELECT 'Pramoedya Ananta Toer', 'Indonesia', 1925
WHERE NOT EXISTS (SELECT 1 FROM penulis WHERE nama = 'Pramoedya Ananta Toer');

INSERT INTO users (name, email, password)
SELECT 'Kenneth', 'kenneth@istts.edu', 'scrypt$11223344556677889900aabbccddeeff$e6eecf435dcb2ba3b9c5938582bf995eed54ce59125f87fde483ccc69b8e6b02d2ad43084134e8011a25fc80ca29d1b6d41084e3491d6cafc666c023efd63a80'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kenneth@istts.edu');

INSERT INTO categories (name, icon)
SELECT 'Makanan', 'food'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Makanan');

INSERT INTO categories (name, icon)
SELECT 'Transportasi', 'transport'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Transportasi');

INSERT INTO categories (name, icon)
SELECT 'Hiburan', 'entertainment'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Hiburan');

```

## scripts/migrate.js

```javascript
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const main = async () => {
    const database = process.env.DB_NAME || "asisten_keuangan";
    // Pemilihan DB dilakukan dari .env; blok untuk impor manual dilewati.
    const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "Gabungan.sql"), "utf8")
        .replace(/-- BEGIN DATABASE SELECTION[\s\S]*?-- END DATABASE SELECTION/, "");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        multipleStatements: true,
    });

    try {
        const quoted = mysql.escapeId(database);

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await connection.query(`USE ${quoted}`);

        await connection.query(sql);

        console.log("[migrate] Gabungan.sql selesai. Data lama tidak dikosongkan.");
    } finally {
        await connection.end();
    }
};

if (require.main === module) {
    main().catch(error => {
        console.error("[migrate] Gagal:", error.message);

        process.exitCode = 1;
    });
}

module.exports = main;

```

## src/controllers/transactionConversion.js

```javascript
const { Transaction, Category, User } = require('../models');
const { parse, idSchema } = require('../utils/validation/resourceSchemas');
const { conversionQuery } = require('../utils/validation/integrationSchemas');
const { getExchangeRate } = require('../services/exchangeRate');

const convertTransaction = async (req, res) => {
    const id = parse(idSchema, req.params.id);
    const { currency } = parse(conversionQuery, req.query);
    const transaction = await Transaction.findByPk(id, {
        attributes: ['id_transaction', 'id_user', 'id_category', 'nominal', 'catatan'],
        include: [
            {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
                required: false
            },
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name'],
                required: false
            }
        ]
    });

    if (!transaction) {
        return res.status(404).json({
            message: 'Transaction tidak ditemukan'
        });
    }

    const exchange = await getExchangeRate(currency);
    const data = transaction.toJSON();
    const amount = Number(data.nominal);

    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error('Nominal tersimpan tidak valid');
    }

    // Ini estimasi tampilan, bukan nilai pembukuan atau settlement.
    const converted = amount * exchange.rate;

    if (!Number.isFinite(converted)) {
        throw new Error('Hasil konversi di luar batas');
    }

    return res.json({
        data: {
            transaction: {
                id_transaction: data.id_transaction,
                id_user: data.id_user,
                id_category: data.id_category,
                nominal: String(data.nominal),
                currency: 'IDR',
                catatan: data.catatan,
                category: data.category ? {
                    id: data.category.id,
                    name: data.category.name
                } : null,
                user: data.user ? {
                    id: data.user.id,
                    name: data.user.name
                } : null
            },
            conversion: {
                ...exchange,
                estimated_amount: converted.toFixed(2),
                display_decimals: 2,
                is_estimate: true
            }
        }
    });
};

module.exports = {
    convertTransaction
};

```

## src/services/exchangeRate.js

```javascript
const { requestUpstream } = require('./upstream');
const httpError = require('../utils/httpError');

const getExchangeRate = async currency => {
    const key = process.env.EXCHANGE_RATE_API_KEY?.trim();

    if (!key || key === 'ISI_API_KEY_ANDA') {
        throw httpError(503, 'Layanan kurs belum dikonfigurasi');
    }

    const response = await requestUpstream({
        method: 'GET',
        url: `https://v6.exchangerate-api.com/v6/${encodeURIComponent(key)}/latest/IDR`
    });
    const data = response.data;
    const rate = data?.conversion_rates?.[currency];

    if (data?.result !== 'success' || data?.base_code !== 'IDR'
    || typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        throw httpError(502, 'Respons layanan kurs tidak valid');
    }

    const seconds = data.time_last_update_unix;
    const updatedAt = typeof seconds === 'number'
    && Number.isFinite(seconds) && seconds > 0 && seconds < 8640000000000
    ? new Date(seconds * 1000).toISOString()
    : null;

    return {
        provider: 'ExchangeRate-API',
        base_currency: 'IDR',
        target_currency: currency,
        rate,
        updated_at: updatedAt
    };
};

module.exports = {
    getExchangeRate
};

```

## src/services/upstream.js

```javascript
const axios = require('axios');
const httpError = require('../utils/httpError');

const getTimeout = () => {
    const configured = Number(process.env.API_TIMEOUT_MS || 5000);

    if (!Number.isInteger(configured) || configured < 100 || configured > 30000) {
        return 5000;
    }

    return configured;
};

const mapUpstreamError = error => {
    if (['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code)) {
        return httpError(504, 'Layanan pihak ketiga melewati batas waktu');
    }

    if (axios.isAxiosError(error) && (error.response || error.request)) {
        return httpError(502, 'Layanan pihak ketiga gagal dihubungi atau mengembalikan kesalahan');
    }

    return httpError(500, 'Terjadi kesalahan pada integrasi layanan');
};

const requestUpstream = async config => {
    const timeout = getTimeout();

    try {
        return await axios.request({
            ...config,
            timeout,
            signal: AbortSignal.timeout(timeout),
            maxRedirects: 0,
            maxContentLength: 1024 * 1024,
            validateStatus: status => status >= 200 && status < 300
        });
    } catch (error) {
        // Jangan mengirim/log error.config: URL provider dapat memuat API key.
        throw mapUpstreamError(error);
    }
};

module.exports = {
    requestUpstream,
    getTimeout,
    mapUpstreamError
};

```

## src/utils/httpError.js

```javascript
const httpError = (status, message) => {
    const error = new Error(message);

    error.status = status;

    error.expose = true;

    return error;
};

module.exports = httpError;

```

## src/utils/validation/integrationSchemas.js

```javascript
const Joi = require("joi");

const conversionQuery = Joi.object({
    currency: Joi.string()
        .trim()
        .uppercase()
        .valid('USD', 'EUR', 'SGD', 'JPY', 'IDR')
        .default('USD')
        .label("currency")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const webhookSchema = Joi.object({
    pesan: Joi.string()
        .trim()
        .min(1)
        .max(2000)
        .required()
        .label("pesan")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const animeQuery = Joi.object({
    q: Joi.string()
        .trim()
        .max(100)
        .allow('')
        .label("q")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(3)
        .label("limit")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .default(1)
        .label("page")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const contohBody = Joi.object({
    nama: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .label("nama")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    umur: Joi.number()
        .integer()
        .min(0)
        .max(150)
        .label("umur")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    jk: Joi.string()
        .valid('L', 'P')
        .label("jk")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        }),

    judul: Joi.string()
        .trim()
        .min(1)
        .max(150)
        .label("judul")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "string.base": "{#label} harus berupa teks",
            "string.empty": "{#label} tidak boleh kosong",
            "string.min": "{#label} minimal {#limit} karakter",
            "string.max": "{#label} maksimal {#limit} karakter",
            "string.length": "{#label} harus {#limit} karakter",
            "string.email": "{#label} harus berupa alamat email yang valid",
            "string.pattern.base": "{#label} memiliki format yang tidak valid",
            "string.alphanum": "{#label} hanya boleh berisi huruf dan angka"
        })
}).min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

module.exports = {
    conversionQuery,
    webhookSchema,
    animeQuery,
    contohBody
};

```

## RANCANGAN.md

````markdown
# Rancangan Asisten Keuangan — perbaikan nomor 4 dan 5

## Cakupan dan status

Implementasi ini menghubungkan Users, Categories, Transactions, Budget, dan endpoint konversi kurs melalui index.js / npm start. Endpoint materi Buku, Contoh, serta ContohAxios dipertahankan. Integrasi Budget tidak berarti seluruh kriteria UTS di luar cakupan ini telah selesai.

Kontrol akses di bawah adalah **rancangan**, sesuai pembahasan nomor 4. Kode belum menerapkan login, JWT, pemeriksaan peran, atau pembatasan pemilik data. Endpoint lokal masih dapat dipanggil tanpa autentikasi. Hash password tidak sama dengan autentikasi maupun otorisasi.

## Nomor 4 — validasi dan perlindungan data

POST/PUT/PATCH yang aktif memakai Joi: Users, Categories, Transactions, Buku, contoh body, demo validasi user, dan webhook. Helper memakai `abortEarly: false`, sehingga semua kesalahan dilaporkan sekaligus. Pesan menyebut field dan menggunakan bahasa Indonesia. Resource utama menolak field asing; Buku serta demo schema memakai `stripUnknown: true`, lalu hanya menggunakan `value` hasil validasi. PATCH resource utama menolak body kosong. Endpoint Transactions menyediakan PATCH, bukan PUT; metode yang tidak tersedia mendapat 405 dan header Allow.

SQL raw memakai replacements untuk nilai dan daftar pilihan sorting yang dibatasi Joi. Model menggunakan satu instance Sequelize. Foreign key menghubungkan `transactions.id_user` ke `users.id` serta `transactions.id_category` ke `categories.id`. Kategori yang masih terpakai ditolak dengan 409. User dihapus secara soft delete sehingga transaksi historis tetap tersimpan.

Password pada create/update Users di-hash memakai scrypt dengan salt acak. Password dan hash tidak dikirim pada respons. Seed user pada SQL menggunakan hash untuk password demo `Password123!`; ini akun latihan, bukan kredensial produksi. Password plaintext yang sudah tersimpan di database lama tidak otomatis dikonversi: perubahan password melalui PUT/PATCH akan menghasilkan hash baru. Belum ada fitur login.

Error handler menyaring error sebelum dikirim: validasi 400, data hilang 404, konflik 409, database tidak tersedia 503, dan error internal generik 500. SQL, nama tabel, stack trace, konfigurasi Axios, URL yang memuat key, dan payload upstream tidak diteruskan kepada client. SQL logging dinonaktifkan secara default.

## Matriks peran × endpoint (rancangan, belum diberlakukan)

Semua jalur diawali `/api/v1`.

| Endpoint | Admin | Pengguna terautentikasi | Tamu |
|---|---|---|---|
| GET /users | Daftar semua user | Ditolak | Ditolak |
| POST /users | Membuat akun | Ditolak | Ditolak |
| GET /users/:id | Semua akun | Akun sendiri | Ditolak |
| PUT/PATCH /users/:id | Semua akun | Akun sendiri | Ditolak |
| DELETE /users/:id | Menghapus secara soft delete | Ditolak | Ditolak |
| GET /categories dan /categories/:id | Boleh | Boleh | Ditolak |
| POST /categories | Boleh | Ditolak | Ditolak |
| PATCH/DELETE /categories/:id | Boleh | Ditolak | Ditolak |
| GET /transactions (termasuk mode=raw) | Semua transaksi | Transaksi sendiri | Ditolak |
| POST /transactions | Boleh, pemilik harus valid | Pemilik diambil dari sesi sendiri | Ditolak |
| PATCH/DELETE /transactions/:id | Semua transaksi | Transaksi sendiri | Ditolak |
| GET /categories/:id/transactions | Semua transaksi kategori | Transaksi sendiri dalam kategori | Ditolak |
| GET /transactions/:id/conversion | Semua transaksi | Transaksi sendiri | Ditolak |
| Semua endpoint /buku, /contoh, /contohAxios | Khusus lingkungan latihan | Ditolak | Ditolak |

Rancangan Admin menjaga pengelolaan akun dan kategori tetap terpusat. Perubahan atau penghapusan data perlu audit identitas admin, waktu, dan ID resource. Rancangan Pengguna melindungi catatan keuangan pribadi: setiap pencarian, perubahan, dan penghapusan harus memeriksa `id_user` milik identitas terverifikasi. Jangan mempercayai `id_user` atau `role` dari body sebagai bukti hak akses. Endpoint nested kategori, raw query, dan konversi kurs wajib mendapat filter kepemilikan yang sama. Tamu tidak boleh membaca data keuangan, email, ataupun memicu penggunaan kuota API.

Implementasi lanjutan memerlukan middleware autentikasi, middleware peran, dan pemeriksaan kepemilikan pada controller/query. Untuk pengguna biasa, isi `id_user` dari identitas terverifikasi. Jangan memakai header buatan sendiri seperti `X-Role: admin` sebagai autentikasi. Endpoint latihan dibatasi lingkungan pengembangan atau akses admin.

## Kredensial lokal dan cloud

Kredensial MySQL, `EXCHANGE_RATE_API_KEY`, dan URL webhook hanya di `.env`. `.gitignore` mengabaikan `.env` dan turunannya, kecuali `.env.example` yang berisi placeholder. `.gitignore` tidak menghapus file yang sudah pernah terlacak: periksa `git ls-files .env`; jika muncul, jalankan `git rm --cached .env` untuk melepasnya dari indeks tanpa menghapus file lokal. Riwayat commit belum diperiksa dalam paket ini. Jika kredensial asli pernah tersebar, ganti kredensial tersebut.

Saat dipasang di cloud, konfigurasi rahasia dipindahkan dari file `.env` lokal ke secret manager atau environment secret platform. Beri akses hanya pada identitas layanan yang membutuhkannya; pisahkan kredensial development dan production, gunakan akun database dengan hak minimum, rotasi key, dan jangan menaruhnya dalam repository, image build, respons, maupun log. Aktifkan TLS untuk akses aplikasi dan koneksi database sesuai konfigurasi penyedia.

## Nomor 5 — menggabungkan database dan API

Endpoint:

```http
GET /api/v1/transactions/:id/conversion?currency=USD
```

Mata uang asal nominal transaksi adalah IDR. Target yang diterima: USD, EUR, SGD, JPY, IDR. Default USD. Sistem mengambil transaksi beserta user dan kategori menggunakan eager loading, lalu meminta kurs IDR melalui Axios ke Standard endpoint ExchangeRate-API. API key dibaca dari environment. URL upstream bersifat tetap; client tidak boleh mengirim URL upstream atau API key lewat query.

API key memang ditempatkan dalam jalur URL sesuai kontrak provider. Karena itu, kode tidak mencetak URL, `error.config`, atau error Axios mentah. Timeout dan AbortSignal membatasi waktu tunggu, redirect dinonaktifkan, serta ukuran respons dibatasi.

Respons milik aplikasi hanya berisi `data.transaction` dari MySQL dan `data.conversion` hasil pemetaan provider. Field provider dipilih dan diganti namanya: `base_code` menjadi `base_currency`, mata uang yang diminta menjadi `target_currency`, satu nilai `conversion_rates` menjadi `rate`, dan `time_last_update_unix` menjadi `updated_at`. Payload provider lengkap tidak diteruskan.

`estimated_amount` adalah estimasi tampilan dengan dua angka desimal, bukan nominal untuk pembukuan, tagihan, atau settlement. Timestamp menunjukkan waktu pembaruan kurs provider, bukan waktu pembuatan transaksi. Nominal asli tetap dikembalikan sebagai string dan tidak diubah di database. Tidak ada klaim kurs real-time atau kurs historis transaksi. Penambahan konversi memenuhi kebutuhan menampilkan perkiraan biaya transaksi dalam mata uang lain.

| Kondisi | Respons |
|---|---|
| ID/query tidak valid | 400, sebelum memanggil provider |
| Transaksi tidak ditemukan | 404, sebelum memanggil provider |
| API key belum diisi | 503 |
| Timeout atau batas AbortSignal tercapai | 504 |
| Network error / non-2xx provider, termasuk 429 | 502 |
| Provider mengembalikan `result: error`, rate hilang, atau payload tidak valid | 502 |
| Kesalahan kode/configuration internal | 500 generik |

Tidak ada fallback kurs dan tidak memakai angka kurs palsu ketika provider gagal. Operasi CRUD transaksi tetap terpisah dari endpoint kurs; kegagalan kurs tidak mengubah data transaksi. Kegagalan webhook memakai kebijakan berbeda: notifikasi bersifat tambahan sehingga tidak menggagalkan penyimpanan Buku. Endpoint uji webhook mengembalikan `notification.sent` serta alasan kegagalan generik, tanpa mengaku terkirim jika gagal.

## Verifikasi

`npm test` menjalankan lima kelompok uji: CRUD dan hubungan resource; model/relasi/SQL; HTTP validasi dan integrasi API; request Axios ke server lokal; dan hash password. Terdapat 49 pemeriksaan HTTP CRUD dan 27 pemeriksaan HTTP tambahan. Pengujian memakai stub database, adapter Axios untuk skenario provider, serta server HTTP lokal untuk memastikan penanganan status dan timeout sungguhan. Semua lulus pada lingkungan penyusunan. Pengujian MySQL nyata, API provider dengan key asli, pengiriman Discord sungguhan, serta kontrol akses berbasis identitas belum dilakukan.

## Referensi implementasi

- [ExchangeRate-API Standard Requests](https://www.exchangerate-api.com/docs/standard-requests)
- [Axios Handling Errors](https://axios-http.com/docs/handling_errors)


## Dana — Transactions, relasi 1:N, ORM dan raw query

Satu User memiliki banyak Transactions melalui `users.id` ke `transactions.id_user`.
Satu Category memiliki banyak Transactions melalui `categories.id` ke `transactions.id_category`.
Registrasi relasi berada di `src/models/index.js`: User/Category memakai hasMany,
sedangkan Transaction memakai belongsTo. Foreign key SQL menguatkan hubungan tersebut.

Lima endpoint wajib Dana adalah POST /transactions, GET /transactions,
GET /categories/:id/transactions, PATCH /transactions/:id dan DELETE /transactions/:id,
semuanya dengan prefix /api/v1. POST memberikan 201 dan Location. PATCH hanya menerima
nominal/catatan; ID referensi tidak dapat dipindahkan melalui PATCH ini.

GET /transactions?mode=orm memakai findAll dan include ke Category/User.
ORM memudahkan penggunaan relasi, Op.like, Op.gte, Op.lte, pagination, dan penyusunan
query tanpa menulis JOIN secara manual. Kekurangannya, bentuk SQL bergantung pada
pemetaan dan opsi Sequelize, sehingga perlu diperiksa saat optimasi.

GET /transactions?mode=raw memakai sequelize.query dengan JOIN eksplisit dan replacements.
Raw query memberi kendali atas kolom dan struktur SQL, tetapi penulis bertanggung jawab
menjaga JOIN, filter soft delete, serta parameter tetap aman. Nilai pencarian dan batas
nominal memakai replacements. Arah sorting dibatasi Joi menjadi asc/desc sebelum
interpolasi karena kata kunci SQL tidak dapat dipasang sebagai parameter nilai biasa.

Kedua versi disediakan untuk memenuhi perbandingan ORM dan raw pada tugas. Keduanya
menghasilkan bentuk respons yang sama: nominal berupa string, category/user berupa
objek terpilih, dan user yang soft-deleted ditampilkan sebagai null. Ini dua versi
operasi baca, bukan menulis transaksi dua kali. Endpoint konversi kurs adalah fitur
tambahan nomor 5, di luar lima endpoint inti Dana.

## Pembaruan SQL Budget

Gabungan.sql kini juga membuat `budget` dan `budget_categories`. Pivot memiliki
allocated_amount, foreign key ke Budget/Category, serta batas unik pasangan
(budget_id, category_id). Budget memiliki batas unik (user_id, month, year).
Penghapusan Budget menghapus alokasinya melalui CASCADE; kategori yang masih dipakai
pivot ditahan RESTRICT. Soft delete User tetap mempertahankan data historis.

Modul Budget aktif melalui registrasi model/router utama. Budget.user_id memakai
DataTypes.INTEGER, sama dengan users.id. Kolom pivot adalah category_id. Joi memvalidasi
bulan, tahun, ID, alokasi, dan kelengkapan PUT. Pesan tersedia pada .messages() di budgetSchemas.js.

## Rafael — Budget dan relasi N:M

Budget belongsTo User. Budget belongsToMany Category melalui Budget_categories;
Category memiliki asosiasi balik belongsToMany Budget. Pivot menyimpan allocated_amount.
GET list/detail memakai include Category dengan through.attributes allocated_amount,
sehingga kategori dan alokasinya tersedia pada satu SELECT JOIN. Tidak ada query kategori
per item dalam loop (N+1). Tes telah memeriksa SQL hasil Sequelize, bukan eksekusi MySQL nyata.

Lima endpoint aktif: POST /budgets, GET /budgets, GET /budgets/:id,
PUT /budgets/:id, DELETE /budgets/:id, semuanya dengan prefiks /api/v1.
Periode user/month/year duplikat ditolak 409, dengan pengecekan controller dan unique SQL.
POST, PUT, dan DELETE memakai transaksi database. PUT mengganti alokasi secara atomik;
kegagalan penulisan pivot membatalkan perubahan parent dan pivot.

Bukti eksekusi satu SELECT JOIN dari MySQL belum tersedia. Jalankan
node scripts/bukti-budget-join.js untuk menghasilkan dokumen BUKTI-BUDGET-JOIN-<waktu>.md.
Dokumen tersebut menjadi lampiran bukti aktual; kode atau tes simulasi bukan log MySQL nyata.

````

## tests/integration.test.js

```javascript
// Uji HTTP dengan penyimpanan stub. Tidak membuka atau mengubah database MySQL.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Op } = require("sequelize");
const app = require("../index");
const db = require("../src/models");

test("Users, Categories dan Transactions terhubung melalui HTTP", async () => {
    const originals = [];

    const replace = (object, key, value) => {
        originals.push([object, key, object[key]]);

        object[key] = value;
    };

    const users = new Map();
    const categories = new Map();
    const transactions = new Map();
    let nextUser = 1, nextCategory = 1, nextTransaction = 1;
    let lastRaw, lastOrm;
    const stamp = "2026-10-10T00:00:00.000Z";

    const record = (values, bucket, idKey, soft = false) => {
        const row = {
            ...values,
            createdAt: stamp,
            updatedAt: stamp
        };

        row.toJSON = () => Object.fromEntries(Object.entries(row).filter(([, v]) => typeof v !== "function"));

        row.update = async value => {
            Object.assign(row, value);

            return row;
        };

        row.destroy = async () => {
            if (soft) {
                row.deletedAt = stamp;
            } else {
                bucket.delete(row[idKey]);
            }
        };

        bucket.set(row[idKey], row);

        return row;
    };

    replace(db.User, "findByPk", async id => {
        const row = users.get(Number(id));

        return row && !row.deletedAt ? row : null;
    });

    replace(db.User, "findAll", async () => [...users.values()].filter(u => !u.deletedAt));

    replace(db.User, "create", async value => {
        if ([...users.values()].some(u => u.email === value.email)) {
            const error = new Error("duplicate");

            error.name = "SequelizeUniqueConstraintError";

            throw error;
        }

        return record({
            ...value,
            id: nextUser++
        }, users, "id", true);
    });

    replace(db.Category, "findByPk", async id => categories.get(Number(id)) || null);

    replace(db.Category, "findAll", async () => [...categories.values()]);

    replace(db.Category, "create", async value => record({
        icon: null,
        ...value,
        id: nextCategory++
    }, categories, "id"));

    replace(db.Transaction, "create", async value => record({
        catatan: null,
        ...value,
        nominal: Number(value.nominal).toFixed(2),
        id_transaction: nextTransaction++,
    }, transactions, "id_transaction"));

    replace(db.Transaction, "findByPk", async id => transactions.get(Number(id)) || null);

    replace(db.Transaction, "count", async ({ where }) => [...transactions.values()].filter(t => t.id_category === where.id_category).length);

    const joined = row => ({
        ...row.toJSON(),
        category: categories.get(row.id_category) || null,
        user: users.get(row.id_user)?.deletedAt ? null : users.get(row.id_user) || null,
    });

    replace(db.Transaction, "findAll", async options => {
        lastOrm = options;

        const { where = {}, limit, offset = 0, order } = options;
        let rows = [...transactions.values()].filter(row => {
            if (where.id_category !== undefined && row.id_category !== where.id_category) {
                return false;
            }

            if (where.catatan && !(row.catatan || "").includes(where.catatan[Op.like].slice(1, -1))) {
                return false;
            }

            if (where.nominal?.[Op.gte] !== undefined && Number(row.nominal) < Number(where.nominal[Op.gte])) {
                return false;
            }

            if (where.nominal?.[Op.lte] !== undefined && Number(row.nominal) > Number(where.nominal[Op.lte])) {
                return false;
            }

            return true;
        });

        rows.sort((a,b) => (Number(a.nominal)-Number(b.nominal))*(order[0][1] === "ASC" ? 1 : -1) || a.id_transaction-b.id_transaction);

        return rows.slice(offset, offset + limit).map(joined);
    });

    replace(db.sequelize, "query", async (sql, options) => {
        lastRaw = {
            sql,
            options
        };

        const q = options.replacements;

        return [...transactions.values()].filter(row =>
        (q.categoryId === undefined || row.id_category === q.categoryId) &&
        (q.search === undefined || (row.catatan || "").includes(q.search.slice(1,-1))) &&
        (q.minNominal === undefined || Number(row.nominal) >= Number(q.minNominal)) &&
        (q.maxNominal === undefined || Number(row.nominal) <= Number(q.maxNominal))
        ).sort((a,b)=>(Number(a.nominal)-Number(b.nominal))*(sql.includes("t.nominal DESC")?-1:1) || a.id_transaction-b.id_transaction)
        .slice(q.offset, q.offset+q.limit).map(row => {
            const j = joined(row);

            return {
                ...row.toJSON(),
                category_id: j.category?.id,
                category_name: j.category?.name,
                category_icon: j.category?.icon,
                user_id: j.user?.id,
                user_name: j.user?.name,
                user_email: j.user?.email
            };
        });
    });

    const server = app.listen(0, "127.0.0.1");

    await new Promise(resolve => server.once("listening", resolve));

    const base = `http://127.0.0.1:${server.address().port}`;
    let checked = 0;

    const request = async (method, url, status, body) => {
        const response = await fetch(base+url, {
            method,
            signal: AbortSignal.timeout(3000),
            headers: body ? {
                "Content-Type": "application/json"
            } : {},
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await response.text();

        assert.equal(response.status, status, `${method} ${url}: ${text}`);

        checked++;

        return {
            body: text ? JSON.parse(text) : null,
            headers: response.headers
        };
    };

    try {
        await request("GET", "/", 200);

        await request("POST", "/api/v1/users", 400, {
            name: "A",
            email: "invalid",
            password: "x"
        });

        const user = await request("POST", "/api/v1/users", 201, {
            name: "Test",
            email: "test@example.com",
            password: "Password123!"
        });

        assert.equal(user.headers.get("location"), "/api/v1/users/1");

        assert.equal(user.body.password, undefined);

        await request("POST", "/api/v1/users", 409, {
            name: "Other",
            email: "test@example.com",
            password: "Password123!"
        });

        await request("GET", "/api/v1/users", 200);

        await request("GET", "/api/v1/users/1", 200);

        await request("GET", "/api/v1/users/999", 404);

        await request("PATCH", "/api/v1/users/1", 200, {
            name: "Updated"
        });

        await request("PATCH", "/api/v1/users/1", 400, {});

        await request("PUT", "/api/v1/users/1", 400, {
            name: "Incomplete"
        });

        await request("PUT", "/api/v1/users/1", 200, {
            name: "Test",
            email: "test@example.com",
            password: "Password456!"
        });

        await request("POST", "/api/v1/categories", 400, {
            name: " "
        });

        const cat = await request("POST", "/api/v1/categories", 201, {
            name: "Makanan",
            icon: "food"
        });

        assert.equal(cat.headers.get("location"), "/api/v1/categories/1");

        await request("GET", "/api/v1/categories", 200);

        await request("GET", "/api/v1/categories/1", 200);

        await request("PATCH", "/api/v1/categories/1", 200, {
            icon: "meal"
        });

        await request("POST", "/api/v1/transactions", 400, {
            id_category: 1,
            id_user: 1,
            nominal: -1
        });

        await request("POST", "/api/v1/transactions", 400, {
            id_category: 1,
            id_user: 1,
            nominal: 1.234
        });

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 99,
            id_user: 1,
            nominal: 10
        });

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 1,
            id_user: 99,
            nominal: 10
        });

        const tx = await request("POST", "/api/v1/transactions", 201, {
            id_category: 1,
            id_user: 1,
            nominal: 12500,
            catatan: "Makan siang"
        });

        assert.equal(tx.headers.get("location"), "/api/v1/transactions/1");

        const query = "/api/v1/transactions?search=Makan&sort=desc&limit=10&offset=0&minNominal=10000&maxNominal=20000";
        const orm = await request("GET", query, 200);

        assert.equal(lastOrm.where.nominal[Op.gte], 10000);

        assert.equal(lastOrm.where.nominal[Op.lte], 20000);

        assert.equal(lastOrm.where.catatan[Op.like], "%Makan%");

        assert.equal(lastOrm.include.length, 2);

        const raw = await request("GET", query+"&mode=raw", 200);

        assert.deepEqual(raw.body, orm.body);

        assert(lastRaw.sql.includes("c.id = t.id_category"));

        assert(lastRaw.sql.includes("u.deletedAt IS NULL"));

        assert.equal(lastRaw.options.replacements.search, "%Makan%");

        assert.equal(orm.body.data[0].user.password, undefined);

        await request("GET", "/api/v1/transactions?limit=0", 400);

        await request("GET", "/api/v1/transactions?sort=bad", 400);

        await request("GET", "/api/v1/transactions?minNominal=20&maxNominal=10", 400);

        await request("GET", "/api/v1/categories/1/transactions", 200);

        await request("GET", "/api/v1/categories/999/transactions", 404);

        await request("DELETE", "/api/v1/categories/1", 409);

        await request("PATCH", "/api/v1/transactions/1", 400, {});

        await request("PATCH", "/api/v1/transactions/1", 400, {
            id_user: 2
        });

        await request("PATCH", "/api/v1/transactions/1", 200, {
            catatan: "Diubah"
        });

        await request("PATCH", "/api/v1/transactions/999", 404, {
            nominal: 1
        });

        await request("DELETE", "/api/v1/users/1", 200);

        assert(users.get(1).deletedAt);

        await request("GET", "/api/v1/users/1", 404);

        const softOrm = await request("GET", "/api/v1/transactions", 200);
        const softRaw = await request("GET", "/api/v1/transactions?mode=raw", 200);

        assert.equal(softOrm.body.data[0].user, null);

        assert.deepEqual(softOrm.body, softRaw.body);

        await request("POST", "/api/v1/transactions", 404, {
            id_category: 1,
            id_user: 1,
            nominal: 10
        });

        for (const [method, url, allow] of [
            ["DELETE", "/api/v1/transactions", "GET, POST"],
            ["PUT", "/api/v1/transactions/1", "PATCH, DELETE"],
            ["POST", "/api/v1/categories/1/transactions", "GET"],
            ["DELETE", "/api/v1/users", "GET, POST"],
            ["PUT", "/api/v1/categories/1", "GET, PATCH, DELETE"],
            ["DELETE", "/api/v1/buku", "GET, POST"],
        ]) assert.equal((await request(method, url, 405)).headers.get("allow"), allow);

        await request("DELETE", "/api/v1/transactions/1", 200);

        await request("DELETE", "/api/v1/transactions/1", 404);

        await request("DELETE", "/api/v1/categories/1", 204);

        await request("GET", "/api/v1/categories/1", 404);

        await request("GET", "/missing", 404);

        console.log(`${checked} pemeriksaan HTTP lulus dengan stub database.`);
    } finally {
        await new Promise(resolve => server.close(resolve));

        for (const [object, key, value] of originals.reverse()) object[key] = value;
    }
});

test("Model, relasi, skema SQL dan kontrak validasi konsisten", async () => {
    assert.equal(require("../config/database"), db.sequelize);

    for (const name of ["User", "Category", "Transaction", "Buku", "Karakter"]) {
        assert.equal(db[name].sequelize, db.sequelize);
    }

    assert.equal(db.User.options.paranoid, true);

    assert.equal(db.Transaction.associations.category.target, db.Category);

    assert.equal(db.Transaction.associations.user.target, db.User);

    assert.equal(db.Category.associations.transactions.foreignKey, "id_category");

    assert.equal(db.User.associations.transactions.foreignKey, "id_user");

    await assert.rejects(db.User.build({
        name: "Test",
        email: "bad",
        password: "x"
    }).validate());

    const category = db.Category.build({
        name: "  MAKANAN   HARIAN "
    });

    assert.equal(category.name, "MAKANAN HARIAN");

    assert.equal(category.formatted_name, "Makanan Harian");

    const sql = fs.readFileSync(path.join(__dirname, "../sql/Gabungan.sql"), "utf8");

    assert.equal((sql.match(/^CREATE TABLE IF NOT EXISTS/gm) || []).length, 8);

    assert.match(sql, /id_category INT UNSIGNED NOT NULL/);

    assert.match(sql, /id_user INT NOT NULL/);

    assert.match(sql, /REFERENCES categories\(id\) ON DELETE RESTRICT/);

    assert.match(sql, /REFERENCES users\(id\) ON DELETE RESTRICT/);

    assert.doesNotMatch(sql, /^\s*(DROP|TRUNCATE|DELETE|REPLACE|UPDATE)\s/im);

    assert.match(sql, /UNIQUE KEY uq_budget_user_period \(user_id, month, year\)/);
    assert.match(sql, /UNIQUE KEY uq_budget_category \(budget_id, category_id\)/);
    assert.match(sql, /FOREIGN KEY \(budget_id\) REFERENCES budget\(budget_id\)/);
    assert.match(sql, /allocated_amount DECIMAL\(10, 2\) NOT NULL/);

    await db.sequelize.close();
});

```

## postman/Transactions-Terhubung.postman_collection.json

```json
{
  "info": {
    "name": "Transactions Terhubung",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001/api/v1"
    },
    {
      "key": "userId",
      "value": ""
    },
    {
      "key": "categoryId",
      "value": ""
    },
    {
      "key": "transactionId",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "01 Buat user",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/users",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Uji Transaksi\",\n  \"email\": \"uji-{{$timestamp}}@example.com\",\n  \"password\": \"Password123!\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 201\", function () { pm.response.to.have.status(201); });",
              "pm.collectionVariables.set(\"userId\", pm.response.json().id);"
            ]
          }
        }
      ]
    },
    {
      "name": "02 Buat category",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/categories",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Uji Makanan\",\n  \"icon\": \"food\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 201\", function () { pm.response.to.have.status(201); });",
              "pm.collectionVariables.set(\"categoryId\", pm.response.json().data.id);"
            ]
          }
        }
      ]
    },
    {
      "name": "03 Buat transaction",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/transactions",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"id_category\": \"{{categoryId}}\",\n  \"id_user\": \"{{userId}}\",\n  \"nominal\": 25000,\n  \"catatan\": \"Makan siang\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 201\", function () { pm.response.to.have.status(201); });",
              "pm.collectionVariables.set(\"transactionId\", pm.response.json().data.id_transaction);"
            ]
          }
        }
      ]
    },
    {
      "name": "04 List ORM",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/transactions?search=Makan&sort=desc&limit=10&offset=0&minNominal=10000"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "05 List RAW",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/transactions?search=Makan&sort=desc&limit=10&offset=0&minNominal=10000&mode=raw"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "06 Transaksi per kategori",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/categories/{{categoryId}}/transactions"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "07 Ubah transaction",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/transactions/{{transactionId}}",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"nominal\": 30000,\n  \"catatan\": \"Makan malam\"\n}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "08 Kategori terpakai ditolak",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": "{{baseUrl}}/categories/{{categoryId}}"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 409\", function () { pm.response.to.have.status(409); });"
            ]
          }
        }
      ]
    },
    {
      "name": "09 Metode salah",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": "{{baseUrl}}/transactions/{{transactionId}}",
        "body": {
          "mode": "raw",
          "raw": "{}"
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 405\", function () { pm.response.to.have.status(405); });"
            ]
          }
        }
      ]
    },
    {
      "name": "10 Hapus transaction",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": "{{baseUrl}}/transactions/{{transactionId}}"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "11 Hapus category",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": "{{baseUrl}}/categories/{{categoryId}}"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 204\", function () { pm.response.to.have.status(204); });"
            ]
          }
        }
      ]
    },
    {
      "name": "12 Soft delete user",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": "{{baseUrl}}/users/{{userId}}"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 200\", function () { pm.response.to.have.status(200); });"
            ]
          }
        }
      ]
    },
    {
      "name": "13 User terhapus menghasilkan 404",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{baseUrl}}/users/{{userId}}"
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "pm.test(\"Status 404\", function () { pm.response.to.have.status(404); });"
            ]
          }
        }
      ]
    }
  ]
}

```
