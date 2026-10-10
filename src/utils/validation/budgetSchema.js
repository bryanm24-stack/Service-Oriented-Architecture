const Joi = require("joi");

const budgetSchema = Joi.object({
    user_id: Joi.number().integer().required().label("User ID").messages({
        "any.required": "{#label} harus diisi",
        "number.base": "{#label} harus berupa angka",
    }),
    month: Joi.number().integer().min(1).max(12).required().label("Bulan").messages({
        "any.required": "{#label} harus diisi",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} harus berupa angka antara 1 dan 12",
        "number.max": "{#label} harus berupa angka antara 1 dan 12",
    }),
    year: Joi.number().integer().min(2000).max(2100).required().label("Tahun").messages({
        "any.required": "{#label} harus diisi",
        "number.base": "{#label} harus berupa angka",   
        "number.min": "{#label} harus berupa angka antara 2000 dan 2100",
        "number.max": "{#label} harus berupa angka antara 2000 dan 2100",
    }),
    budget_categories: Joi.array().items(
        Joi.object({
            category_id: Joi.number().integer().required().label("Category ID").messages({
                "any.required": "{#label} harus diisi",
                "number.base": "{#label} harus berupa angka",
            }),
            allocated_amount: Joi.number().positive().required().label("Allocated Amount").messages({
                "any.required": "{#label} harus diisi",
                "number.base": "{#label} harus berupa angka",
                "number.positive": "{#label} harus berupa angka positif",
            })
        })
    ).required().label("Budget Categories").messages({
        "any.required": "{#label} harus diisi"
    })
    .min(1)
    .required()
    .label("Budget Categories")
    .messages({
        "any.required": "{#label} harus diisi",
        "array.min": "{#label} harus memiliki setidaknya {#limit} item",
    }),
});

module.exports = budgetSchema;