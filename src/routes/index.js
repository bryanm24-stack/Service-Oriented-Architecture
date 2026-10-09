/**
 * Satu pintu ekspor untuk semua router.
 * Tanpa file ini, index.js penuh require satu per satu.
 */
const contohRouter = require("./contoh");
const bukuRouter = require("./buku");
const axiosRouter = require("./contohAxios");

const categoryRouter = require("./category");
const userRouter = require("./userRoutes");

module.exports = {
  contohRouter,
  bukuRouter,
  axiosRouter,
  categoryRouter,
  userRouter,
};
