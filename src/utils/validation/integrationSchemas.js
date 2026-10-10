const Joi = require('joi');

const conversionQuery = Joi.object({
    currency: Joi.string().trim().uppercase().valid('USD', 'EUR', 'SGD', 'JPY', 'IDR').default('USD')
});

const webhookSchema = Joi.object({
    pesan: Joi.string().trim().min(1).max(2000).required()
});

const animeQuery = Joi.object({
    q: Joi.string().trim().max(100).allow(''),
    limit: Joi.number().integer().min(1).max(20).default(3),
    page: Joi.number().integer().min(1).max(10000).default(1)
});

const contohBody = Joi.object({
    nama: Joi.string().trim().min(1).max(100),
    umur: Joi.number().integer().min(0).max(150),
    jk: Joi.string().valid('L', 'P'),
    judul: Joi.string().trim().min(1).max(150)
}).min(1);

module.exports = {
    conversionQuery,
    webhookSchema,
    animeQuery,
    contohBody
};
