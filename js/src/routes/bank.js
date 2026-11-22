const router=require('express').Router(),wrap=require('../utils/asyncHandler'),c=require('../controllers/bank');
router.get('/status',wrap(c.status));router.post('/connections',wrap(c.create));router.post('/imports/preview',wrap(c.preview));router.post('/imports/:id/confirm',wrap(c.confirm));module.exports=router;
