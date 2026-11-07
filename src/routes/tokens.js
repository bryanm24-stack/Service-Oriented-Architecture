const router = require('express').Router();
const wrap = require('../utils/asyncHandler');
const methodNotAllowed = require('../middlewares/methodNotAllowed');
const admin = require('../middlewares/auth').checkRoles(['admin']);
const bundles = require('../controllers/tokenBundles');
const purchases = require('../controllers/tokenPurchases');

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});

router.route('/token-bundles').get(wrap(bundles.active)).all(methodNotAllowed('GET'));
router.use('/admin/token-bundles', admin);
router.route('/admin/token-bundles').get(wrap(bundles.all)).post(wrap(bundles.create))
  .all(methodNotAllowed('GET', 'POST'));
router.route('/admin/token-bundles/:id').get(wrap(bundles.show)).put(wrap(bundles.put))
  .patch(wrap(bundles.patch)).delete(wrap(bundles.archive))
  .all(methodNotAllowed('GET', 'PUT', 'PATCH', 'DELETE'));
router.route('/token-purchases').get(wrap(purchases.list)).post(wrap(purchases.create))
  .all(methodNotAllowed('GET', 'POST'));
router.route('/token-purchases/:orderId/checkout').get(wrap(purchases.inspectCheckout))
  .post(wrap(purchases.startCheckout)).all(methodNotAllowed('GET', 'POST'));
router.route('/token-purchases/:orderId').get(wrap(purchases.show)).all(methodNotAllowed('GET'));

module.exports = router;
