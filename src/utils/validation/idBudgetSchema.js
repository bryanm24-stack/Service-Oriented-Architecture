const Joi = require("joi");

const idBudgetSchema = Joi.object({
    user_id: Joi.number().integer().required().label("User ID").messages({
        "any.required": "{#label} harus diisi",
        "number.base": "{#label} harus berupa angka",
        "number.integer": "{#label} harus berupa angka bulat",
        "number.positive": "{#label} harus berupa angka positif"
    }),
});

module.exports = idBudgetSchema
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
        "string.alphanum": "{#label} hanya boleh berisi huruf dan angka",
        "number.base": "{#label} harus berupa angka",
        "number.integer": "{#label} harus berupa bilangan bulat",
        "number.min": "{#label} minimal {#limit}",
        "number.max": "{#label} maksimal {#limit}",
        "number.positive": "{#label} harus lebih dari nol",
        "number.unsafe": "{#label} melebihi batas angka aman",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan",
        "object.with": "{#mainWithLabel} harus disertai {#peerWithLabel}",
        "array.base": "{#label} harus berupa array",
        "array.min": "{#label} minimal berisi {#limit} item",
        "array.unique": "{#label} tidak boleh berisi data duplikat",
        "alternatives.match": "{#label} memiliki format yang tidak valid",
        "alternatives.types": "{#label} harus berupa angka atau teks angka",
        "date.base": "{#label} harus berupa tanggal",
        "date.format": "{#label} harus berupa tanggal berformat ISO",
        "date.greater": "{#label} harus setelah {#limit}",
        "date.less": "{#label} harus sebelum {#limit}"
    });