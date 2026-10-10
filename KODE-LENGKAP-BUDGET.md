# Kode lengkap Budget terintegrasi

Versi terintegrasi. Jalankan npm start; SQL aktif sql/Gabungan.sql. Petunjuk lengkap: MULAI-DI-SINI.md.

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

## src/routes/budget.js

```javascript
const router = require('express').Router();
const controller = require('../controllers/budget');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/')
    .post(asyncHandler(controller.createBudget))
    .get(asyncHandler(controller.getAllBudgets))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/:id')
    .get(asyncHandler(controller.getBudgetById))
    .put(asyncHandler(controller.updateBudget))
    .delete(asyncHandler(controller.deleteBudget))
    .all(methodNotAllowed('GET', 'PUT', 'DELETE'));

module.exports = router;

```

## src/controllers/budget.js

```javascript
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

```

## src/models/Budget.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const Budget = sequelize.define('Budget', {
    budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            isInt: true
        }
    },
    month: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
            min: 1,
            max: 12,
            isInt: true
        }
    },
    year: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        validate: {
            min: 2000,
            max: 2100,
            isInt: true
        }
    },
    keterangan: {
        type: DataTypes.VIRTUAL,
        get() {
            return `Anggaran ${this.month}/${this.year} untuk user ${this.user_id}`;
        }
    }
}, {
    tableName: 'budget',
    timestamps: true,
    indexes: [
        {
            name: 'uq_budget_user_period',
            unique: true,
            fields: ['user_id', 'month', 'year']
        }
    ]
});

module.exports = Budget;

```

## src/models/Budget_categories.js

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../databases/connection');

const BudgetCategory = sequelize.define('Budget_categories', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    budget_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    category_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
    },
    allocated_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    }
}, {
    tableName: 'budget_categories',
    timestamps: true,
    indexes: [
        {
            name: 'uq_budget_category',
            unique: true,
            fields: ['budget_id', 'category_id']
        }
    ]
});

module.exports = BudgetCategory;

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

## src/utils/validation/budgetSchemas.js

```javascript
const Joi = require('joi');

const positiveId = Joi.number()
    .integer()
    .min(1)
    .max(2147483647)
    .messages({
        'any.required': '{#label} wajib diisi',
        'number.base': '{#label} harus berupa angka',
        'number.integer': '{#label} harus berupa bilangan bulat',
        'number.min': '{#label} minimal {#limit}',
        'number.max': '{#label} maksimal {#limit}',
        'number.unsafe': '{#label} melebihi batas aman'
    });

const budgetId = positiveId.required().label('budget_id');

// String tidak dikonversi lebih dahulu ke Number, agar jumlah desimal tetap diperiksa.
const allocatedAmount = Joi.alternatives()
    .try(
        Joi.number().strict().positive().max(99999999.99),
        Joi.string().pattern(/^\d{1,8}(\.\d{1,2})?$/)
    )
    .custom((value, helpers) => {
        if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(value)) || Number(value) <= 0) {
            return helpers.error('any.invalid');
        }

        return String(value);
    })
    .required()
    .label('allocated_amount')
    .messages({
        'any.required': '{#label} wajib diisi',
        'any.invalid': '{#label} harus lebih dari nol dan maksimal dua angka desimal',
        'alternatives.match': '{#label} harus lebih dari nol, maksimal 99999999.99 dan dua angka desimal',
        'alternatives.types': '{#label} harus berupa angka atau teks angka',
        'number.base': '{#label} harus berupa angka',
        'number.positive': '{#label} harus lebih dari nol',
        'number.max': '{#label} maksimal {#limit}',
        'string.empty': '{#label} tidak boleh kosong',
        'string.pattern.base': '{#label} memiliki format nominal yang tidak valid'
    });

const allocationSchema = Joi.object({
    category_id: positiveId.required().label('category_id'),
    allocated_amount: allocatedAmount
})
    .required()
    .messages({
        'any.required': 'Item budget_categories wajib diisi',
        'object.base': 'Item budget_categories harus berupa objek',
        'object.unknown': '{#label} tidak diizinkan'
    });

const budgetBody = Joi.object({
    user_id: positiveId.required().label('user_id'),
    month: Joi.number()
        .integer()
        .min(1)
        .max(12)
        .required()
        .label('month')
        .messages({
            'any.required': '{#label} wajib diisi',
            'number.base': '{#label} harus berupa angka',
            'number.integer': '{#label} harus berupa bilangan bulat',
            'number.min': '{#label} minimal 1',
            'number.max': '{#label} maksimal 12'
        }),
    year: Joi.number()
        .integer()
        .min(2000)
        .max(2100)
        .required()
        .label('year')
        .messages({
            'any.required': '{#label} wajib diisi',
            'number.base': '{#label} harus berupa angka',
            'number.integer': '{#label} harus berupa bilangan bulat',
            'number.min': '{#label} minimal 2000',
            'number.max': '{#label} maksimal 2100'
        }),
    budget_categories: Joi.array()
        .items(allocationSchema)
        .min(1)
        .max(100)
        .unique('category_id')
        .required()
        .label('budget_categories')
        .messages({
            'any.required': '{#label} wajib diisi',
            'array.base': '{#label} harus berupa array',
            'array.min': '{#label} minimal berisi satu kategori',
            'array.max': '{#label} maksimal berisi {#limit} kategori',
            'array.unique': 'category_id tidak boleh berulang dalam budget_categories',
            'array.sparse': '{#label} tidak boleh memiliki item kosong',
            'array.includesRequiredUnknowns': '{#label} harus berisi kategori yang valid'
        })
})
    .required()
    .messages({
        'any.required': 'Body wajib diisi',
        'object.base': 'Body harus berupa objek JSON',
        'object.unknown': '{#label} tidak diizinkan'
    });

const budgetListQuery = Joi.object({
    user_id: positiveId.label('user_id')
})
    .messages({
        'object.base': 'Query tidak valid',
        'object.unknown': '{#label} tidak diizinkan'
    });

module.exports = {
    budgetBody,
    budgetId,
    budgetListQuery
};

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

## scripts/bukti-budget-join.js

```javascript
// Node.js 18+. Hanya membaca database melalui GET /api/v1/budgets.
require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../index');
const { sequelize } = require('../src/models');

const main = async () => {
    const logs = [];
    const originalLogging = sequelize.options.logging;
    sequelize.options.logging = sql => logs.push(sql);
    const server = app.listen(0, '127.0.0.1');

    try {
        await once(server, 'listening');

        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/v1/budgets`);
        const body = await response.json();

        if (response.status !== 200) {
            throw new Error('GET Budget gagal. Periksa koneksi dan struktur database.');
        }

        const selects = logs.filter(sql => /\bSELECT\b/i.test(sql));

        if (selects.length !== 1 || !/JOIN/i.test(selects[0]) ||
            !selects[0].includes('budget_categories') || !selects[0].includes('allocated_amount')) {
            throw new Error('Jumlah/bentuk SELECT belum memenuhi bukti satu query JOIN.');
        }

        const stamp = new Date().toISOString();
        const filename = `BUKTI-BUDGET-JOIN-${stamp.replace(/[:.]/g, '-')}.md`;
        const report = [
            '# Bukti GET Budget pada MySQL',
            '',
            `Waktu: ${stamp}`,
            'Endpoint: GET /api/v1/budgets',
            'HTTP: 200',
            `Jumlah Budget: ${body.data.length}`,
            'Jumlah SELECT: 1',
            '',
            'SQL berikut ditangkap dari request yang benar-benar dijalankan:',
            '',
            '```sql',
            selects[0],
            '```',
            '',
            'Tidak ada isi baris data atau kredensial yang dicantumkan.',
            'Jika jumlah Budget nol, JOIN tetap dijalankan, tetapi contoh pivot perlu Budget yang berisi kategori.',
            ''
        ].join('\n');

        await fs.writeFile(path.join(__dirname, '..', filename), report, { flag: 'wx' });
        console.log(`Bukti tersimpan: ${filename}`);
    } finally {
        sequelize.options.logging = originalLogging;
        await new Promise(resolve => server.close(resolve));
        await sequelize.close();
    }
};

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});

```
