require("dotenv").config();

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
    process.env.DB_NAME || "soa_minggu6",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "",
    {
        host: process.env.DB_HOST || "127.0.0.1",
        port: Number(process.env.DB_PORT) || 3306,
        dialect: "mysql",
        logging: process.env.SQL_LOG === "true" ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            idle: 10000
        },
        define: {
            freezeTableName: true
        },
    }
);

const testConnection = async () => {
    try {
        await sequelize.authenticate();

        console.log("[DB] Koneksi MySQL berhasil.");
    } catch (error) {
        console.error("[DB] Koneksi gagal. Periksa MySQL dan .env.");
    }
};

module.exports = {
    sequelize,
    testConnection
};
