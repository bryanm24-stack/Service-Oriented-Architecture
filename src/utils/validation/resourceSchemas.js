const Joi = require("joi");

const positiveId = Joi.number()
    .integer()
    .min(1)
    .max(2147483647)
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
    });

const idSchema = positiveId.required().label("id");

const userFields = {
    name: Joi.string()
        .trim()
        .min(1)
        .max(255)
        .label("name")
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

    email: Joi.string()
        .trim()
        .email()
        .max(255)
        .label("email")
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

    password: Joi.string()
        .min(8)
        .max(100)
        .label("password")
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
};

const userCreate = Joi.object({
    name: userFields.name.required(),
    email: userFields.email.required(),
    password: userFields.password.required()
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const userPatch = Joi.object(userFields)
    .min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const categoryFields = {
    name: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .label("name")
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

    icon: Joi.string()
        .trim()
        .max(255)
        .allow(null, "")
        .label("icon")
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
};

const categoryCreate = Joi.object({
    ...categoryFields,
    name: categoryFields.name.required()
})
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

const categoryPatch = Joi.object(categoryFields)
    .min(1)
    .messages({
        "any.required": "{#label} wajib diisi",
        "object.base": "{#label} harus berupa objek JSON",
        "object.min": "{#label} harus memiliki minimal {#limit} field",
        "object.unknown": "{#label} tidak diizinkan"
    });

// Batas nominal sesuai DECIMAL(15, 2). Pertahankan kontrak angka/teks angka.
const amount = Joi.alternatives()
    .try(
        Joi.number().min(0).max(9999999999999.99),
        Joi.string().pattern(/^\d{1,13}(\.\d{1,2})?$/)
    )
    .custom((value, helpers) => {
        if (/^\d{1,13}(\.\d{1,2})?$/.test(String(value))) {
            return value;
        }

        return helpers.error("any.invalid");
    })
    .messages({
        "any.required": "{#label} wajib diisi",
        "any.invalid": "{#label} tidak valid",
        "alternatives.match": "{#label} memiliki format yang tidak valid",
        "alternatives.types": "{#label} harus berupa angka atau teks angka",
        "number.base": "{#label} harus berupa angka",
        "number.min": "{#label} minimal {#limit}",
        "number.max": "{#label} maksimal {#limit}",
        "number.unsafe": "{#label} melebihi batas angka aman",
        "string.pattern.base": "{#label} memiliki format yang tidak valid",
        "string.empty": "{#label} tidak boleh kosong"
    });

const transactionCreate = Joi.object({
    id_category: positiveId.required().label("id_category"),
    id_user: positiveId.required().label("id_user"),
    nominal: amount.required().label("nominal"),

    catatan: Joi.string()
        .max(10000)
        .allow(null, "")
        .label("catatan")
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

const transactionPatch = Joi.object({
    nominal: amount.label("nominal"),

    catatan: Joi.string()
        .max(10000)
        .allow(null, "")
        .label("catatan")
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

const transactionQuery = Joi.object({
    search: Joi.string()
        .allow("")
        .max(255)
        .default("")
        .label("search")
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

    sort: Joi.string()
        .lowercase()
        .valid("asc", "desc")
        .default("asc")
        .label("sort")
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
        .max(100)
        .default(10)
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

    offset: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .label("offset")
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

    minNominal: amount.label("minNominal"),

    maxNominal: amount.label("maxNominal"),

    mode: Joi.string()
        .valid("orm", "raw")
        .default("orm")
        .label("mode")
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

const userQuery = Joi.object({
    search: Joi.string()
        .allow("")
        .max(255)
        .default("")
        .label("search")
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

    sort: Joi.string()
        .valid("id", "name", "email", "createdAt")
        .default("id")
        .label("sort")
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
        .max(100)
        .default(10)
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

    offset: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .label("offset")
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

// Dipakai controller Users, Categories, Transactions, dan integrasi API.
// Kontrak tetap: kembalikan value, atau lempar error 400 ke errorHandler.
const parse = (schema, input) => {
    const { error, value } = schema.required().validate(input, {
        abortEarly: false,
        errors: {
            label: "path"
        }
    });

    if (error) {
        const failure = new Error("Validasi gagal");

        failure.status = 400;
        failure.details = error.details.map(item => ({
            field: item.path.join(".") || "_schema",
            message: item.message
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
