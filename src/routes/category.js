const admin = require('../middlewares/auth').checkRoles(['admin']);
const router = require('express').Router();
const controller = require('../controllers/category');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router
  .route('/')
  .get(asyncHandler(controller.getCategories))
  .post(admin, asyncHandler(controller.createCategory))
  .all(methodNotAllowed('GET', 'POST'));

router
  .route('/:id')
  .get(asyncHandler(controller.getCategoryById))
  .put(admin, asyncHandler(controller.replaceCategory))
  .patch(admin, asyncHandler(controller.updateCategory))
  .delete(admin, asyncHandler(controller.deleteCategory))
  .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));

module.exports = router;
