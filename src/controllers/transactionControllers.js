const { Op, QueryTypes } = require('sequelize');

const sequelize = require('../config/database');

const {
    Transaction,
    Category,
    User
} = require('../models');


// ======================================================
// POST /api/v1/transactions
// CREATE TRANSACTION
// ======================================================

const createTransaction = async (req, res, next) => {
    try {
        const {
            id_category,
            id_user,
            nominal,
            catatan
        } = req.body;

        // Validasi sederhana
        if (
            id_category === undefined ||
            id_user === undefined ||
            nominal === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'id_category, id_user, dan nominal wajib diisi'
            });
        }

        // Pastikan category ada
        const category = await Category.findByPk(id_category);

        if (category === null) {
            return res.status(404).json({
                success: false,
                message: 'Category tidak ditemukan'
            });
        }

        // Pastikan user ada
        const user = await User.findByPk(id_user);

        if (user === null) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        const transaction = await Transaction.create({
            id_category,
            id_user,
            nominal,
            catatan
        });

        // WAJIB sesuai spesifikasi
        res.setHeader(
            'Location',
            '/api/v1/transactions/' + transaction.id_transaction
        );

        return res.status(201).json({
            success: true,
            message: 'Transaction berhasil dibuat',
            data: transaction
        });

    } catch (error) {
        next(error);
    }
};


// ======================================================
// GET /api/v1/categories/:id/transactions
// NESTED RESOURCE
// ======================================================

const getTransactionsByCategory = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Pastikan category ada
        const category = await Category.findByPk(id);

        if (category === null) {
            return res.status(404).json({
                success: false,
                message: 'Category tidak ditemukan'
            });
        }

        const transactions = await Transaction.findAll({
            where: {
                id_category: id
            },
            include: [
                {
                    model: Category,
                    as: 'category'
                },
                {
                    model: User,
                    as: 'user'
                }
            ],
            order: [
                ['id_transaction', 'ASC']
            ]
        });

        return res.status(200).json({
            success: true,
            data: transactions
        });

    } catch (error) {
        next(error);
    }
};


// ======================================================
// GET /api/v1/transactions
// VERSI 1 - ORM
// ======================================================

const getTransactionsORM = async (req, res, next) => {
    try {
        const {
            search = '',
            sort = 'asc',
            limit = 10,
            offset = 0,
            minNominal,
            maxNominal
        } = req.query;

        // ------------------------------------------
        // Normalisasi pagination
        // ------------------------------------------

        const parsedLimit = Number(limit);
        const parsedOffset = Number(offset);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit <= 0 ||
            parsedLimit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'limit harus berupa angka 1-100'
            });
        }

        if (
            !Number.isInteger(parsedOffset) ||
            parsedOffset < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'offset harus berupa angka >= 0'
            });
        }

        // ------------------------------------------
        // Validasi sorting
        // ------------------------------------------

        const normalizedSort = sort.toLowerCase();

        if (!['asc', 'desc'].includes(normalizedSort)) {
            return res.status(400).json({
                success: false,
                message: 'sort hanya boleh asc atau desc'
            });
        }

        // ------------------------------------------
        // WHERE
        // ------------------------------------------

        const where = {};

        // Search menggunakan Op.like
        if (search.trim() !== '') {
            where.catatan = {
                [Op.like]: `%${search.trim()}%`
            };
        }

        // Op.gte
        if (minNominal !== undefined) {
            const min = Number(minNominal);

            if (!Number.isFinite(min)) {
                return res.status(400).json({
                    success: false,
                    message: 'minNominal harus berupa angka'
                });
            }

            where.nominal = {
                ...(where.nominal || {}),
                [Op.gte]: min
            };
        }

        // Op.lte
        if (maxNominal !== undefined) {
            const max = Number(maxNominal);

            if (!Number.isFinite(max)) {
                return res.status(400).json({
                    success: false,
                    message: 'maxNominal harus berupa angka'
                });
            }

            where.nominal = {
                ...(where.nominal || {}),
                [Op.lte]: max
            };
        }

        // ------------------------------------------
        // Query ORM
        // ------------------------------------------

        const transactions = await Transaction.findAll({
            where,

            include: [
                {
                    model: Category,
                    as: 'category'
                },
                {
                    model: User,
                    as: 'user'
                }
            ],

            order: [
                ['nominal', normalizedSort.toUpperCase()]
            ],

            limit: parsedLimit,
            offset: parsedOffset
        });

        return res.status(200).json({
            success: true,

            meta: {
                search,
                sort: normalizedSort,
                limit: parsedLimit,
                offset: parsedOffset,
                count: transactions.length
            },

            data: transactions
        });

    } catch (error) {
        next(error);
    }
};


// ======================================================
// GET /api/v1/transactions
// VERSI 2 - RAW QUERY
// ======================================================

const getTransactionsRaw = async (req, res, next) => {
    try {
        const {
            search = '',
            sort = 'asc',
            limit = 10,
            offset = 0,
            minNominal,
            maxNominal
        } = req.query;

        // ------------------------------------------
        // Normalisasi pagination
        // ------------------------------------------

        const parsedLimit = Number(limit);
        const parsedOffset = Number(offset);

        if (
            !Number.isInteger(parsedLimit) ||
            parsedLimit <= 0 ||
            parsedLimit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: 'limit harus berupa angka 1-100'
            });
        }

        if (
            !Number.isInteger(parsedOffset) ||
            parsedOffset < 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'offset harus berupa angka >= 0'
            });
        }

        // ------------------------------------------
        // Validasi sorting
        // ------------------------------------------

        const normalizedSort = sort.toLowerCase();

        if (!['asc', 'desc'].includes(normalizedSort)) {
            return res.status(400).json({
                success: false,
                message: 'sort hanya boleh asc atau desc'
            });
        }

        // ------------------------------------------
        // WHERE dinamis
        // ------------------------------------------

        const conditions = [];
        const replacements = {
            search: `%${search.trim()}%`,
            limit: parsedLimit,
            offset: parsedOffset
        };

        // Sama dengan ORM:
        // catatan LIKE %search%

        if (search.trim() !== '') {
            conditions.push(
                't.catatan LIKE :search'
            );
        }

        // Sama dengan Op.gte
        if (minNominal !== undefined) {
            const min = Number(minNominal);

            if (!Number.isFinite(min)) {
                return res.status(400).json({
                    success: false,
                    message: 'minNominal harus berupa angka'
                });
            }

            conditions.push(
                't.nominal >= :minNominal'
            );

            replacements.minNominal = min;
        }

        // Sama dengan Op.lte
        if (maxNominal !== undefined) {
            const max = Number(maxNominal);

            if (!Number.isFinite(max)) {
                return res.status(400).json({
                    success: false,
                    message: 'maxNominal harus berupa angka'
                });
            }

            conditions.push(
                't.nominal <= :maxNominal'
            );

            replacements.maxNominal = max;
        }

        // ------------------------------------------
        // WHERE clause
        // ------------------------------------------

        const whereClause =
            conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';

        // ------------------------------------------
        // ORDER BY
        //
        // normalizedSort sudah divalidasi hanya
        // ASC / DESC sehingga aman dimasukkan
        // sebagai SQL identifier keyword.
        // ------------------------------------------

        const sql = `
            SELECT
                t.id_transaction,
                t.id_category,
                t.id_user,
                t.nominal,
                t.catatan,
                t.createdAt,
                t.updatedAt,

                c.id_category AS category_id,
                c.nama_category AS category_nama,

                u.id_user AS user_id,
                u.nama AS user_nama,
                u.email AS user_email

            FROM transactions AS t

            LEFT JOIN categories AS c
                ON c.id_category = t.id_category

            LEFT JOIN users AS u
                ON u.id_user = t.id_user

            ${whereClause}

            ORDER BY t.nominal ${normalizedSort.toUpperCase()}

            LIMIT :limit
            OFFSET :offset
        `;

        const transactions = await sequelize.query(sql, {
            replacements,
            type: QueryTypes.SELECT
        });

        // ------------------------------------------
        // Bentuk hasil dibuat menyerupai include ORM
        // ------------------------------------------

        const data = transactions.map(transaction => ({
            id_transaction: transaction.id_transaction,

            id_category: transaction.id_category,

            id_user: transaction.id_user,

            nominal: transaction.nominal,

            catatan: transaction.catatan,

            createdAt: transaction.createdAt,

            updatedAt: transaction.updatedAt,

            category: transaction.category_id
                ? {
                    id_category: transaction.category_id,
                    nama_category: transaction.category_nama
                }
                : null,

            user: transaction.user_id
                ? {
                    id_user: transaction.user_id,
                    nama: transaction.user_nama,
                    email: transaction.user_email
                }
                : null
        }));

        return res.status(200).json({
            success: true,

            meta: {
                search,
                sort: normalizedSort,
                limit: parsedLimit,
                offset: parsedOffset,
                count: data.length
            },

            data
        });

    } catch (error) {
        next(error);
    }
};


// ======================================================
// PATCH /api/v1/transactions/:id
// PARTIAL UPDATE
// ======================================================

const updateTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        const {
            nominal,
            catatan
        } = req.body;

        // Cari transaction berdasarkan ID
        const transaction = await Transaction.findByPk(id);

        // WAJIB 404 jika null
        if (transaction === null) {
            return res.status(404).json({
                success: false,
                message: 'Transaction tidak ditemukan'
            });
        }

        // PATCH hanya boleh mengubah nominal/catatan
        if (
            nominal === undefined &&
            catatan === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: 'Minimal nominal atau catatan harus dikirim'
            });
        }

        if (nominal !== undefined) {
            const parsedNominal = Number(nominal);

            if (
                !Number.isFinite(parsedNominal) ||
                parsedNominal < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'nominal harus berupa angka >= 0'
                });
            }

            transaction.nominal = parsedNominal;
        }

        if (catatan !== undefined) {
            transaction.catatan = catatan;
        }

        await transaction.save();

        return res.status(200).json({
            success: true,
            message: 'Transaction berhasil diperbarui',
            data: transaction
        });

    } catch (error) {
        next(error);
    }
};


// ======================================================
// DELETE /api/v1/transactions/:id
// DELETE TRANSACTION
// ======================================================

const deleteTransaction = async (req, res, next) => {
    try {
        const { id } = req.params;

        const transaction = await Transaction.findByPk(id);

        // WAJIB 404 jika null
        if (transaction === null) {
            return res.status(404).json({
                success: false,
                message: 'Transaction tidak ditemukan'
            });
        }

        await transaction.destroy();

        return res.status(200).json({
            success: true,
            message: 'Transaction berhasil dihapus'
        });

    } catch (error) {
        next(error);
    }
};


module.exports = {
    createTransaction,
    getTransactionsByCategory,

    // Versi ORM
    getTransactionsORM,

    // Versi Raw SQL
    getTransactionsRaw,

    updateTransaction,
    deleteTransaction
};