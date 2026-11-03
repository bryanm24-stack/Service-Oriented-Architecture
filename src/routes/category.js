const router = require('express').Router();
const controller = require('../controllers/category');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/')
    .get(asyncHandler(controller.getCategories))
    .post(asyncHandler(controller.createCategory))
    .all(methodNotAllowed('GET', 'POST'));

router.route('/:id')
    .get(asyncHandler(controller.getCategoryById))
    .put(asyncHandler(controller.replaceCategory))
    .patch(asyncHandler(controller.updateCategory))
    .delete(asyncHandler(controller.deleteCategory))
    .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));

module.exports = router;
