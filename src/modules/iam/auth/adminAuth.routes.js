const router = require('express').Router();
const { verifyToken } = require('../../../middlewares/auth.middleware');
const controller = require('./adminAuth.controller');

router.post('/send-email-otp', controller.sendEmailOtp);
router.post('/verify-email-otp', controller.verifyEmailOtp);
router.post('/sync-profile', verifyToken, controller.syncProfile);

module.exports = router;
