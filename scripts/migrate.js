require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const main = async () => {
    const database = process.env.DB_NAME || "soa_minggu6";
    const sql = fs.readFileSync(path.join(__dirname, "..", "sql", "Gabungan.sql"), "utf8");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        multipleStatements: true,
    });

    try {
        const quoted = mysql.escapeId(database);

        await connection.query(`CREATE DATABASE IF NOT EXISTS ${quoted} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

        await connection.query(`USE ${quoted}`);

        await connection.query(sql);

        console.log("[migrate] Gabungan.sql selesai. Data lama tidak dikosongkan.");
    } finally {
        await connection.end();
    }
};

if (require.main === module) {
    main().catch(error => {
        console.error("[migrate] Gagal:", error.message);

        process.exitCode = 1;
    });
}

module.exports = main;
