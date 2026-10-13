const router = require("express").Router();
const controller = require("../controllers/transactionControllers");
const asyncHandler = require("../utils/asyncHandler");
const methodNotAllowed = require("../middlewares/methodNotAllowed");

const { convertTransaction } = require('../controllers/transactionConversion');

router.route('/transactions/:id/conversion')
.get(asyncHandler(convertTransaction))
.all(methodNotAllowed('GET'));

// Router ini dipasang pada /api/v1, karena mencakup dua resource path.
router.route("/transactions")
.get(asyncHandler(controller.getTransactions))
.post(asyncHandler(controller.createTransaction))
.all(methodNotAllowed("GET", "POST"));

router.route("/categories/:id/transactions")
.get(asyncHandler(controller.getTransactionsByCategory))
.all(methodNotAllowed("GET"));

router.route("/transactions/:id")
.patch(asyncHandler(controller.updateTransaction))
.delete(asyncHandler(controller.deleteTransaction))
.all(methodNotAllowed("PATCH", "DELETE"));

module.exports = router;
