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
