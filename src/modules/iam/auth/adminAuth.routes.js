const router = require('express').Router();
const { verifyToken } = require('../../../middlewares/auth.middleware');
const controller = require('./adminAuth.controller');

router.post('/send-email-otp', controller.sendEmailOtp);
router.post('/verify-email-otp', controller.verifyEmailOtp);
router.post('/send-phone-otp', controller.sendPhoneOtp);
router.post('/verify-phone-otp', controller.verifyPhoneOtp);
router.post('/firebase-phone-login', controller.firebasePhoneLogin);
router.post('/sync-profile', verifyToken, controller.syncProfile);

// Profile Management
router.patch('/profile', verifyToken, controller.updateProfile);
router.post('/profile/request-phone-verification', verifyToken, controller.requestPhoneVerification);
router.post('/profile/verify-phone', verifyToken, controller.verifyPhoneVerification);
router.post('/profile/link-firebase-phone', verifyToken, controller.linkFirebasePhone);

module.exports = router;
