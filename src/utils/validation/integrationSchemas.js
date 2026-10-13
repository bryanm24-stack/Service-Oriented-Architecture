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

module.exports = { conversionQuery };
