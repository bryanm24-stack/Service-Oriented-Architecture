const router = require('express').Router();
const controller = require('../controllers/budget');
const { getBudgetSummary } = require('../controllers/budgetSummary');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/')
    .get(asyncHandler(controller.getAllBudgets))
    .post(asyncHandler(controller.createBudget))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/:id/summary')
    .get(asyncHandler(getBudgetSummary))
    .all(methodNotAllowed('GET'));

router.route('/:id')
    .get(asyncHandler(controller.getBudgetById))
    .put(asyncHandler(controller.updateBudget))
    .patch(asyncHandler(controller.patchBudget))
    .delete(asyncHandler(controller.deleteBudget))
    .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));

module.exports = router;
