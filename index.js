/**
 * TITIK MASUK APLIKASI
 */

require("dotenv").config();

const express = require("express");

const app = express();

const logger =
  require("./src/middlewares/logger");

const notFound =
  require("./src/middlewares/notFound");

const errorHandler =
  require("./src/middlewares/errorHandler");

const {
  contohRouter,
  bukuRouter,
  axiosRouter,
  categoryRouter,
} = require("./src/routes");

const {
  testConnection,
} = require("./src/databases/connection");


const port =
  process.env.PORT || 3001;


// ============================================================
// MIDDLEWARE GLOBAL
// ============================================================

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(logger);


// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  return res.json({
    service: "SOA Minggu 6",
    version: "1.0.0",

    endpoints: [
      "/api/v1/contoh",
      "/api/v1/buku",
      "/api/v1/contohAxios",
      "/api/v1/categories",
    ],
  });
});


// ============================================================
// ROUTER
// ============================================================

app.use(
  "/api/v1/contoh",
  contohRouter
);

app.use(
  "/api/v1/buku",
  bukuRouter
);

app.use(
  "/api/v1/contohAxios",
  axiosRouter
);

app.use(
  "/api/v1/categories",
  categoryRouter
);


// ============================================================
// ERROR HANDLER
// ============================================================

// Route tidak ditemukan
app.use(notFound);

// Error server
app.use(errorHandler);


// ============================================================
// SERVER
// ============================================================

app.listen(port, () => {
  console.log(
    `Example app listening on port ${port}!`
  );

  testConnection();
});