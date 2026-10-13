const router = require('express').Router();
const controller = require('../controllers/budget');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/')
    .post(asyncHandler(controller.createBudget))
    .get(asyncHandler(controller.getAllBudgets))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/:id')
    .get(asyncHandler(controller.getBudgetById))
    .put(asyncHandler(controller.updateBudget))
    .delete(asyncHandler(controller.deleteBudget))
    .all(methodNotAllowed('GET', 'PUT', 'DELETE'));

module.exports = router;
