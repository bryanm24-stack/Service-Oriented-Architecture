const router = require('express').Router();
const controller = require('../controllers/UserController');
const transactions = require('../controllers/transactionControllers');
const budgets = require('../controllers/budget');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/')
    .get(asyncHandler(controller.getAllUsers))
    .post(asyncHandler(controller.createUser))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/:id/transactions')
    .get(asyncHandler(transactions.getTransactionsByUser))
    .all(methodNotAllowed('GET'));

router.route('/:id/budgets')
    .get(asyncHandler(budgets.getBudgetsByUser))
    .all(methodNotAllowed('GET'));

router.route('/:id/subscription-status')
    .get(asyncHandler(controller.getUserSubscription))
    .all(methodNotAllowed('GET'));

router.route('/:id')
    .get(asyncHandler(controller.getUserById))
    .put(asyncHandler(controller.updateUser))
    .patch(asyncHandler(controller.patchUser))
    .delete(asyncHandler(controller.deleteUser))
    .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));

module.exports = router;
