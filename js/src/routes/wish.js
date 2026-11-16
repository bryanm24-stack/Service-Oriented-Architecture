const router = require('express').Router();
const controller = require('../controllers/wish');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.route('/simulate')
  .post(asyncHandler(controller.simulate))
  .all(methodNotAllowed('POST'));

router.route('/')
  .get(asyncHandler(controller.list))
  .post(asyncHandler(controller.create))
  .all(methodNotAllowed('GET', 'POST'));

router.route('/:id/installments/:installmentId/pay')
  .post(asyncHandler(controller.payInstallment))
  .all(methodNotAllowed('POST'));

router.route('/:id/pay')
  .post(asyncHandler(controller.payCash))
  .all(methodNotAllowed('POST'));

router.route('/:id')
  .get(asyncHandler(controller.getOne))
  .put(asyncHandler(controller.update))
  .delete(asyncHandler(controller.remove))
  .all(methodNotAllowed('GET', 'PUT', 'DELETE'));

module.exports = router;
