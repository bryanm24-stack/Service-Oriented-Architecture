# Validasi aktif

Pesan error ada langsung pada .messages() di masing-masing schema, termasuk Budget; tidak memakai joiMessages.js.

| File | Penggunaan |
|---|---|
| resourceSchemas.js | Users, Categories, Transactions dan helper parse() |
| budgetSchemas.js | Body POST/PUT Budget, ID Budget, query daftar Budget |
| budgetSchema.js | Alias budgetBody untuk kompatibilitas |
| idBudgetSchema.js | Alias budgetId untuk validasi params.id |
| integrationSchemas.js | Aturan query kurs, anime, body contoh, webhook |
| bukuSchema.js | Aturan Buku |
| userSchema.js | Demo user dari materi |
| validateJoi.js | Helper yang tetap digunakan Buku dan Contoh |

Controller Budget menggunakan parse() dari resourceSchemas.js. Seluruh error dikumpulkan melalui abortEarly: false. PUT Budget wajib lengkap. budgetSchema dan idBudgetSchema pada index.js tetap diekspor sebagai alias schema aktif.
