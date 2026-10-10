require("dotenv").config();

const express = require("express");
const app = express();
const routes = require("./src/routes");
const { testConnection } = require("./src/databases/connection");

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(require("./src/middlewares/logger"));

app.get("/", (req, res) => res.json({
    service: "SOA Asisten Keuangan",
    version: "1.0.0",
    endpoints: ["/api/v1/users", "/api/v1/categories", "/api/v1/transactions",
    "/api/v1/contoh", "/api/v1/buku", "/api/v1/contohAxios"],
}));

app.use("/api/v1", routes.transactionRouter);

app.use("/api/v1/users", routes.userRouter);

app.use("/api/v1/categories", routes.categoryRouter);

app.use("/api/v1/contoh", routes.contohRouter);

app.use("/api/v1/buku", routes.bukuRouter);

app.use("/api/v1/contohAxios", routes.axiosRouter);

app.use(require("./src/middlewares/notFound"));

app.use(require("./src/middlewares/errorHandler"));

if (require.main === module) {
    const port = process.env.PORT || 3001;

    app.listen(port, () => {
        console.log(`Server berjalan di port ${port}`);

        testConnection();
    });
}

module.exports = app;
