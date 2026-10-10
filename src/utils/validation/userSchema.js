/**
* SCHEMA VALIDASI USER — DEMO JOI — MINGGU 5
* ==========================================
*
* Endpoint demo: POST /api/v1/contoh/validasi (lihat controllers/contoh.js).
*
* Bukan bagian dari resource buku — ini SATU endpoint yang memuat semua
* fitur Joi yang akan kalian butuhkan di tugas dan di project:
*
*   .label()           nama field yang tampil di pesan error
*   .messages()        pesan bahasa Indonesia per kode error
*   .pattern()         aturan regex (kekuatan password)
*   Joi.ref()          membandingkan dua field (konfirmasi password)
*   .default()         isi nilai saat field tidak dikirim
*   .with()            aturan LINTAS field: A harus datang bersama B
*
* Datanya memang tidak masuk database — ini latihan bentuk, bukan
* persistensi. Bedakan dengan bukuSchema yang dipakai endpoint sungguhan.
*/
const Joi = require("joi");

const userSchema = Joi.object({
    pengguna_username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .label("Nama Pengguna")
    .messages({
        "any.required": "{#label} harus diisi yaa",
        "string.empty": "{#label} harus diisi yaa",
        "string.alphanum": "{#label} harus dalam bentuk alphanumeric saja",
        "string.min": "{#label} harus lebih dari {#limit} karakter",
        "string.max": "{#label} harus kurang dari {#limit} karakter",
    }),
    pengguna_email: Joi.string()
    .email({
        tlds: {
            allow: ["edu", "com"]
        }
    })
    .required()
    .label("Email Pengguna")
    .messages({
        "any.required": "{#label} harus diisi yaa",
        "string.empty": "{#label} harus diisi yaa",
        "string.email": "{#label} hanya boleh diakhiri .edu atau .com",
    }),

    // Regex kekuatan password: minimal 1 huruf kecil, 1 besar, 1 angka,
    // 1 simbol, panjang minimal 8.
    // PERHATIKAN: ditulis sebagai string regex, jadi `\d` harus `\\d` —
    // salah satu backslash akan membuat pattern yang TIDAK PERNAH cocok.
    pengguna_password: Joi.string()
    .pattern(
        new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$")
    )
    .required()
    .label("Password Pengguna")
    .messages({
        "any.required": "{#label} harus diisi yaa",
        "string.empty": "{#label} harus diisi yaa",
        "string.pattern.base":
        "{#label} harus diisi dengan minimal 1 huruf kecil, 1 huruf besar, 1 angka dan 1 simbol, dengan panjang minimal 8 karakter",
    }),
    pengguna_konfirmasi_password: Joi.any()
    .equal(Joi.ref("pengguna_password"))
    .required()
    .label("Konfirmasi Password")
    .messages({
        "any.required": "{#label} harus diisi yaa",
        "any.only": "{#label} harus sama dengan password",
    }),
    pengguna_birthday: Joi.date()
    .greater("1970-01-01")
    .less("now")
    .iso()
    .label("Birthday Pengguna")
    .messages({
        "date.greater": "{#label} harus lebih dari 1 Januari 1970",
        "date.less": "{#label} harus kurang dari sekarang",
        "date.format": "{#label} harus dalam format YYYY-MM-DD",
        "date.base": "{#label} harus berupa tanggal",
    }),
    pengguna_umur: Joi.number()
    .integer()
    .min(17)
    .max(100)
    .default(17) // tidak dikirim -> otomatis 17
    .label("Umur Pengguna")
    .messages({
        "number.base": "{#label} harus dalam bentuk angka",
        "number.integer": "{#label} harus dalam bentuk angka bulat",
        "number.min": "{#label} harus dalam bentuk angka antara 17-100",
        "number.max": "{#label} harus dalam bentuk angka antara 17-100",
    }),

    // ---------------------------------------------------------------
    // ATURAN LINTAS FIELD — dinyatakan DI BAWAH, bukan di field.
    // app_name dikirim -> app_token WAJIB ikut. Tidak ada aturan
    // per-field yang bisa menyatakan hubungan antar dua field.
    // ---------------------------------------------------------------
    app_name: Joi.any().label("Application Name"),
    app_token: Joi.any().label("Application Token"),
})
.with("app_name", "app_token")
.messages({
    "object.with":
    "{{#mainWithLabel}} harus dikirim bersama dengan {{#peerWithLabel}}",
});

module.exports = userSchema
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
