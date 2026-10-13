# Validasi keuangan

resourceSchemas.js berisi Joi Users, Categories, Transactions dan parse() dengan abortEarly:false.
budgetSchemas.js berisi body lengkap Budget, PATCH, ID, dan query list.
integrationSchemas.js berisi query konversi kurs. Pesan berada pada .messages() dalam schema masing-masing.
budgetSchema.js dan idBudgetSchema.js adalah alias kompatibilitas schema Budget.

Tidak ada schema Buku, Contoh, anime, webhook, atau helper template di folder ini.
