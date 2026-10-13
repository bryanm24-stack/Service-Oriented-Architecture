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

const webhookSchema = Joi.object({
    pesan: Joi.string()
        .trim()
        .min(1)
        .max(2000)
        .required()
        .label("pesan")
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

const animeQuery = Joi.object({
    q: Joi.string()
        .trim()
        .max(100)
        .allow('')
        .label("q")
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
        }),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .default(3)
        .label("limit")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    page: Joi.number()
        .integer()
        .min(1)
        .max(10000)
        .default(1)
        .label("page")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        })
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const contohBody = Joi.object({
    nama: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .label("nama")
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
        }),

    umur: Joi.number()
        .integer()
        .min(0)
        .max(150)
        .label("umur")
        .messages({
            "any.required": "{#label} wajib diisi",
            "any.only": "{#label} harus salah satu dari {#valids}",
            "any.invalid": "{#label} tidak valid",
            "number.base": "{#label} harus berupa angka",
            "number.integer": "{#label} harus berupa bilangan bulat",
            "number.min": "{#label} minimal {#limit}",
            "number.max": "{#label} maksimal {#limit}",
            "number.positive": "{#label} harus lebih dari nol",
            "number.unsafe": "{#label} melebihi batas angka aman"
        }),

    jk: Joi.string()
        .valid('L', 'P')
        .label("jk")
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
        }),

    judul: Joi.string()
        .trim()
        .min(1)
        .max(150)
        .label("judul")
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
}).min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

module.exports = {
    conversionQuery,
    webhookSchema,
    animeQuery,
    contohBody
};
