/**
 * SCHEMA VALIDASI BUKU — MINGGU 5
 * ===============================
 *
 * Bandingkan dengan `aturanBuku` di controllers/buku.js versi Minggu 2-4
 * (git log -p). Aturannya SAMA — yang berubah bentuk penulisannya:
 * objek aturan manual diganti schema Joi yang dideklaratif.
 *
 * Kenapa Joi?
 *
 *   1. SATU tempat untuk aturan + PESANNYA (Minggu 2-4, pesan error
 *      tersebar di src/utils/validate.js).
 *   2. Semua error sekaligus — `abortEarly: false` (dulu: fitur yang
 *      kita tulis sendiri di validate.js; sekarang: satu opsi).
 *   3. Aturan lintas-field (Joi.ref, .with) — yang tidak bisa
 *      dinyatakan validasi per-field.
 *
 * Schema ini adalah LAPIS PERTAMA dari tiga lapis validasi:
 *   Joi (di sini) -> model Sequelize (src/models/Buku.js) -> MySQL constraint.
 * Lapisan lainnya TIDAK dihapus — lihat PANDUAN bagian "Tiga lapis validasi".
 */
const Joi = require("joi");

const TAHUN_SEKARANG = new Date().getFullYear();

const bukuSchema = Joi.object({
  judul: Joi.string()
    .min(3)
    .max(150)
    .required()
    .label("Judul")
    .messages({
      "any.required": "{#label} harus diisi",
      "string.empty": "{#label} harus diisi",
      "string.min": "{#label} minimal {#limit} karakter",
      "string.max": "{#label} maksimal {#limit} karakter",
    }),

  penulis: Joi.string()
    .min(3)
    .max(100)
    .required()
    .label("Penulis")
    .messages({
      "any.required": "{#label} harus diisi",
      "string.empty": "{#label} harus diisi",
      "string.min": "{#label} minimal {#limit} karakter",
      "string.max": "{#label} maksimal {#limit} karakter",
    }),

  tahun_terbit: Joi.number()
    .integer()
    .min(1900)
    .max(TAHUN_SEKARANG)
    .required()
    .label("Tahun terbit")
    .messages({
      "any.required": "{#label} harus diisi",
      "number.base": "{#label} harus berupa angka",
      "number.integer": "{#label} harus berupa angka bulat",
      "number.min": "{#label} minimal {#limit}",
      "number.max": `{#label} maksimal ${TAHUN_SEKARANG}`,
    }),

  harga: Joi.number()
    .min(0)
    .required()
    .label("Harga")
    .messages({
      "any.required": "{#label} harus diisi",
      "number.base": "{#label} harus berupa angka",
      "number.min": "{#label} tidak boleh negatif",
    }),

  stok: Joi.number()
    .integer()
    .min(0)
    .default(0) // kalau tidak dikirim, dianggap 0 — sama seperti `default: 0` dulu
    .label("Stok")
    .messages({
      "number.base": "{#label} harus berupa angka",
      "number.integer": "{#label} harus berupa angka bulat",
      "number.min": "{#label} tidak boleh negatif",
    }),

  kategori: Joi.string()
    .valid("novel", "komik", "non-fiksi", "referensi")
    .required()
    .label("Kategori")
    .messages({
      "any.required": "{#label} harus diisi",
      "any.only":
        "{#label} harus salah satu dari: novel, komik, non-fiksi, referensi",
    }),
});

module.exports = bukuSchema
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
