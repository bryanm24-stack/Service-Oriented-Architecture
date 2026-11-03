// Kompatibilitas perintah lama. Aplikasi utama sudah mencakup Budget.
const app = require('./index');
const { testConnection } = require('./src/databases/connection');

if (require.main === module) {
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
        console.log(`Server berjalan di port ${port}`);
        testConnection();
    });
}

module.exports = app;
