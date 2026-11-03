const router = require('express').Router();
const controller = require('../controllers/transactionControllers');
const { convertTransaction } = require('../controllers/transactionConversion');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/transactions')
    .get(asyncHandler(controller.getTransactions))
    .post(asyncHandler(controller.createTransaction))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/transactions/:id/conversion')
    .get(asyncHandler(convertTransaction))
    .all(methodNotAllowed('GET'));

router.route('/categories/:id/transactions')
    .get(asyncHandler(controller.getTransactionsByCategory))
    .all(methodNotAllowed('GET'));

router.route('/transactions/:id')
    .get(asyncHandler(controller.getTransactionById))
    .put(asyncHandler(controller.replaceTransaction))
    .patch(asyncHandler(controller.updateTransaction))
    .delete(asyncHandler(controller.deleteTransaction))
    .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));

module.exports = router;
