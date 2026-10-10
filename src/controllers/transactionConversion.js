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
