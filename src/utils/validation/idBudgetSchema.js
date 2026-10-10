const Joi = require("joi");

const idBudgetSchema = Joi.object({
    user_id: Joi.number().integer().required().label("User ID").messages({
        "any.required": "{#label} harus diisi",
        "number.base": "{#label} harus berupa angka",
        "number.integer": "{#label} harus berupa angka bulat",
        "number.positive": "{#label} harus berupa angka positif"
    }),
});

module.exports = idBudgetSchema;