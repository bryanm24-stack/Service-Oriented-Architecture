/**
 * ROUTES BUKU
 * ===========
 *
 * File ini hanya menjawab satu pertanyaan: URL mana memanggil fungsi mana.
 * Tidak boleh ada logika bisnis di sini. Kalau kalian melihat `if` atau
 * `.filter()` di file routes, itu tanda ada yang salah tempat.
 *
 * Baca file ini dari atas ke bawah dan kalian langsung tahu
 * SELURUH permukaan API untuk resource buku. Itulah gunanya dipisah.
 */

const express = require("express");
const router = express.Router();
const methodNotAllowed = require("../middlewares/methodNotAllowed");
const asyncHandler = require("../utils/asyncHandler");

const budgetController = require("../controllers/budget");

/**
 * SEJAK MINGGU 3: setiap controller dibungkus `asyncHandler(...)`.
 *
 * Controller-controller itu sekarang `async` dan bicara ke MySQL lewat
 * `await`. Kalau query-nya gagal (MySQL mati, dsb), fungsi async itu
 * me-reject sebuah Promise — dan Express 4 TIDAK menangkap Promise yang
 * reject secara otomatis. `asyncHandler` yang menangkapnya dan
 * meneruskannya ke errorHandler.js. Baca src/utils/asyncHandler.js
 * untuk penjelasan lengkapnya.
 */

/* ==================================================================
 * BAGIAN 1 — SATU URL, BANYAK METHOD
 * ==================================================================
 *
 * Inilah inti REST: URL menunjuk BENDA (resource),
 * method menunjuk PERBUATAN terhadap benda itu.
 *
 *     GET  /api/v1/buku   -> "tunjukkan daftar buku"
 *     POST /api/v1/buku   -> "tambahkan buku ke daftar"
 *
 * Alamatnya sama persis. Yang berbeda kata kerjanya.
 * Ini disebut ROUTING BERDASARKAN METHOD (method-based routing),
 * dan ini perilaku bawaan HTTP — bukan trik Express.
 *
 * `.route()` membuat hal itu terbaca jelas dalam satu blok.
 * Alternatifnya menulis router.get("/") dan router.post("/") terpisah;
 * hasilnya identik, hanya kurang enak dibaca.
 */
const routePrefix = "/api/v1/budgets";
router
  .route(routePrefix)
  .get(asyncHandler(budgetController.getAllBudgets))     // GET    /api/v1/budgets
  .post(asyncHandler(budgetController.createBudget))    // POST   /api/v1/budgets
  .all(methodNotAllowed("GET", "POST"));
//   ^^^^
//   .all() menangkap SEMUA method lain pada path yang sama.
//   Tanpa baris ini, DELETE /api/v1/buku jatuh ke notFound -> 404.
//   Padahal alamatnya jelas ada; yang salah methodnya -> 405.

/* ==================================================================
 * BAGIAN 2 — URUTAN ROUTE ITU MENENTUKAN
 * ==================================================================
 *
 * Express mencocokkan route DARI ATAS KE BAWAH, dan berhenti
 * pada yang pertama cocok.
 *
 * "/statistik" dan "/:bukuId" sama-sama cocok dengan URL /api/v1/buku/statistik.
 * Kalau "/:bukuId" ditulis lebih dulu, maka:
 *
 *     GET /api/v1/buku/statistik
 *       -> cocok dengan /:bukuId
 *       -> req.params.bukuId = "statistik"
 *       -> Number("statistik") = NaN
 *       -> cariBuku(NaN) = undefined
 *       -> 404 "Buku dengan id statistik tidak ditemukan"
 *
 * Errornya menyesatkan karena tidak ada yang salah dengan controller.
 * Yang salah URUTANNYA.
 *
 * ATURAN: route spesifik (teks tetap) SELALU di atas route berparameter.
 *
 * Silakan coba sendiri: pindahkan blok /:bukuId ke atas blok ini,
 * restart, lalu panggil /api/v1/buku/statistik. Lihat apa yang terjadi.
 */

// router.route("/statistik").get(asyncHandler(budgetController.getBudgetStatistics)).all(methodNotAllowed("GET"));

/* ==================================================================
 * BAGIAN 4 — SATU RESOURCE, EMPAT PERBUATAN
 * ==================================================================
 *
 * Sekali lagi: satu alamat, empat fungsi berbeda, dipilih oleh method.
 *
 *     GET    /api/v1/buku/1  -> baca
 *     PUT    /api/v1/buku/1  -> ganti SELURUHNYA
 *     PATCH  /api/v1/buku/1  -> ubah SEBAGIAN
 *     DELETE /api/v1/buku/1  -> hapus
 *
 * Bandingkan dengan gaya lama yang masih sering terlihat:
 *
 *     GET /api/getBuku?id=1
 *     GET /api/updateBuku?id=1&judul=xxx
 *     GET /api/deleteBuku?id=1        <-- GET yang menghapus data!
 *
 * Yang terakhir berbahaya sungguhan. GET seharusnya AMAN (tidak mengubah
 * apa pun). Browser, crawler, dan proxy bebas memanggil URL GET kapan saja
 * untuk prefetch. Kalau GET menghapus data, data kalian bisa terhapus
 * tanpa ada manusia yang menekan tombol.
 */
router
  .route(`${routePrefix}/:id`)
  .get(asyncHandler(budgetController.getBudgetById))
  .put(asyncHandler(budgetController.updateBudget))
  .patch(asyncHandler(budgetController.updateBudget))
  .delete(asyncHandler(budgetController.deleteBudget))
  .all(methodNotAllowed("GET", "PUT", "PATCH", "DELETE"));

module.exports = router;
