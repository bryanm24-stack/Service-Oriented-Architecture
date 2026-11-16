const router = require('express').Router();
const controller = require('../controllers/recurringCost');
const asyncHandler = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');

router.post('/preview', asyncHandler(controller.preview));
router.route('/')
  .get(asyncHandler(controller.list))
  .post(asyncHandler(controller.create))
  .all(methodNotAllowed('GET', 'POST'));
router.route('/:id/occurrences')
  .get(asyncHandler(controller.listOccurrences))
  .all(methodNotAllowed('GET'));
router.route('/:id/occurrences/:occurrenceId')
  .patch(asyncHandler(controller.updateOccurrence))
  .all(methodNotAllowed('PATCH'));
router.route('/:id/status')
  .patch(asyncHandler(controller.setStatus))
  .all(methodNotAllowed('PATCH'));
router.route('/:id')
  .get(asyncHandler(controller.getOne))
  .patch(asyncHandler(controller.update))
  .delete(asyncHandler(controller.archive))
  .all(methodNotAllowed('GET', 'PATCH', 'DELETE'));
module.exports = router;
