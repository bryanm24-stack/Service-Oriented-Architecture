const Joi = require("joi");
const messages = require("./joiMessages");
const positiveId = Joi.number().integer().min(1).max(2147483647);
const idSchema = positiveId.required();
const userFields = {
    name: Joi.string().trim().min(1).max(255),
    email: Joi.string().trim().email().max(255),
    password: Joi.string().min(8).max(100),
};
const userCreate = Joi.object({
    name: userFields.name.required(),
    email: userFields.email.required(),
    password: userFields.password.required(),
});
const userPatch = Joi.object(userFields).min(1);
const categoryFields = {
    name: Joi.string().trim().min(1).max(100),
    icon: Joi.string().trim().max(255).allow(null, ""),
};
const categoryCreate = Joi.object({
    ...categoryFields,
    name: categoryFields.name.required()
});
const categoryPatch = Joi.object(categoryFields).min(1);
// Validasi uang tanpa pembulatan diam-diam oleh Joi.
const amount = Joi.alternatives().try(
    Joi.number().min(0).max(9999999999999.99),
    Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/)
).custom((value, helpers) => /^\d{1,13}(\.\d{1,2})?$/.test(String(value))
? value : helpers.error("any.invalid"));
const transactionCreate = Joi.object({
    id_category: positiveId.required(),
    id_user: positiveId.required(),
    nominal: amount.required(),
    catatan: Joi.string().max(10000).allow(null, ""),
});
const transactionPatch = Joi.object({
    nominal: amount,
    catatan: Joi.string().max(10000).allow(null, "")
}).min(1);
const transactionQuery = Joi.object({
    search: Joi.string().allow("").max(255).default(""),
    sort: Joi.string().lowercase().valid("asc", "desc").default("asc"),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
    minNominal: amount,
    maxNominal: amount,
    mode: Joi.string().valid("orm", "raw").default("orm"),
});
const userQuery = Joi.object({
    search: Joi.string().allow("").max(255).default(""),
    sort: Joi.string().valid("id", "name", "email", "createdAt").default("id"),
    limit: Joi.number().integer().min(1).max(100).default(10),
    offset: Joi.number().integer().min(0).default(0),
});

const parse = (schema, input) => {
    const { error, value } = schema.required().validate(input, {
        abortEarly: false,
        messages,
        errors: {
            label: "path"
        }
    });

    if (error) {
        const failure = new Error("Validasi gagal");

        failure.status = 400;

        failure.details = error.details.map(e => ({
            field: e.path.join("."),
            message: e.message
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
