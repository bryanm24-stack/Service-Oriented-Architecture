# Inventaris 30 endpoint existing

Sumber: registrasi route pada `index.js` dan `src/routes/`, bukan daftar fitur rencana.
Jumlah dihitung sebagai pasangan method + path: Users 9, Categories 6, Transactions 8, Budgets 7.
`GET /` adalah metadata server di luar 30 endpoint bisnis. Handler `.all(...)` hanya respons 405.
Semua 30 pasangan tercakup pada koleksi Postman existing, yang berisi 52 request termasuk kasus negatif.

**Autentikasi saat baseline: seluruh 30 endpoint belum memakai JWT.** Identitas user pada body/path belum menjadi bukti kepemilikan. Kontrak JWT di dokumen baru adalah pekerjaan berikutnya.

| No | Method | Endpoint | Route | Controller / handler |
|---|---|---|---|---|
| 1 | GET | `/api/v1/users` | `userRoutes.js` | `UserController.js → getAllUsers` |
| 2 | POST | `/api/v1/users` | `userRoutes.js` | `UserController.js → createUser` |
| 3 | GET | `/api/v1/users/:id/transactions` | `userRoutes.js` | `transactionControllers.js → getTransactionsByUser` |
| 4 | GET | `/api/v1/users/:id/budgets` | `userRoutes.js` | `budget.js → getBudgetsByUser` |
| 5 | GET | `/api/v1/users/:id/subscription-status` | `userRoutes.js` | `UserController.js → getUserSubscription` |
| 6 | GET | `/api/v1/users/:id` | `userRoutes.js` | `UserController.js → getUserById` |
| 7 | PUT | `/api/v1/users/:id` | `userRoutes.js` | `UserController.js → updateUser` |
| 8 | PATCH | `/api/v1/users/:id` | `userRoutes.js` | `UserController.js → patchUser` |
| 9 | DELETE | `/api/v1/users/:id` | `userRoutes.js` | `UserController.js → deleteUser` |
| 10 | GET | `/api/v1/categories` | `category.js` | `category.js → getCategories` |
| 11 | POST | `/api/v1/categories` | `category.js` | `category.js → createCategory` |
| 12 | GET | `/api/v1/categories/:id` | `category.js` | `category.js → getCategoryById` |
| 13 | PUT | `/api/v1/categories/:id` | `category.js` | `category.js → replaceCategory` |
| 14 | PATCH | `/api/v1/categories/:id` | `category.js` | `category.js → updateCategory` |
| 15 | DELETE | `/api/v1/categories/:id` | `category.js` | `category.js → deleteCategory` |
| 16 | GET | `/api/v1/transactions` | `transactionRoutes.js` | `transactionControllers.js → getTransactions` |
| 17 | POST | `/api/v1/transactions` | `transactionRoutes.js` | `transactionControllers.js → createTransaction` |
| 18 | GET | `/api/v1/transactions/:id/conversion` | `transactionRoutes.js` | `transactionConversion.js → convertTransaction` |
| 19 | GET | `/api/v1/categories/:id/transactions` | `transactionRoutes.js` | `transactionControllers.js → getTransactionsByCategory` |
| 20 | GET | `/api/v1/transactions/:id` | `transactionRoutes.js` | `transactionControllers.js → getTransactionById` |
| 21 | PUT | `/api/v1/transactions/:id` | `transactionRoutes.js` | `transactionControllers.js → replaceTransaction` |
| 22 | PATCH | `/api/v1/transactions/:id` | `transactionRoutes.js` | `transactionControllers.js → updateTransaction` |
| 23 | DELETE | `/api/v1/transactions/:id` | `transactionRoutes.js` | `transactionControllers.js → deleteTransaction` |
| 24 | GET | `/api/v1/budgets` | `budget.js` | `budget.js → getAllBudgets` |
| 25 | POST | `/api/v1/budgets` | `budget.js` | `budget.js → createBudget` |
| 26 | GET | `/api/v1/budgets/:id/summary` | `budget.js` | `budgetSummary.js → getBudgetSummary` |
| 27 | GET | `/api/v1/budgets/:id` | `budget.js` | `budget.js → getBudgetById` |
| 28 | PUT | `/api/v1/budgets/:id` | `budget.js` | `budget.js → updateBudget` |
| 29 | PATCH | `/api/v1/budgets/:id` | `budget.js` | `budget.js → patchBudget` |
| 30 | DELETE | `/api/v1/budgets/:id` | `budget.js` | `budget.js → deleteBudget` |

## Format lama yang dipertahankan

| Kelompok | Bentuk respons existing |
|---|---|
| Users | Daftar berupa array langsung; detail berupa objek User; delete berupa message |
| Categories | Umumnya message + data; delete 204 tanpa JSON |
| Transactions | Envelope success + data; daftar juga mempunyai total/limit/offset; delete message |
| Budgets | Envelope status='success' + data; delete 204 tanpa JSON |
| Conversion / subscription-status | Envelope data dengan bentuk integrasi masing-masing |

Nama PK existing: User/Category `id`, Transaction `id_transaction`, Budget `budget_id`.
Owner existing: Transaction `id_user`, Budget `user_id`.
Jangan mengubah nama atau membungkus ulang seluruh respons hanya untuk menyamakan UI.
Frontend menormalkan DTO melalui satu adapter bersama yang baru akan diimplementasikan.

Matriks JSON yang bisa dipakai alat bantu: [endpoints.json](baseline/endpoints.json).
Kasus query `mode=orm/raw` adalah dua implementasi GET yang sama, bukan endpoint baru.
