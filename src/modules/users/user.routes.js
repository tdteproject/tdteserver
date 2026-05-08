const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const {
	accountCreationLimiter,
	highCostWriteLimiter,
} = require('../../middlewares/security.middleware');
const userController = require('./user.controller');

/**
 * User Routes — /api/v1/user
 * All routes require a valid Firebase Bearer token.
 */

const { uploadProfile } = require('../../config/storage');

// POST /api/v1/user/profile — Create or update user profile
router.post('/profile', accountCreationLimiter, verifyToken, userController.upsertProfile);

// POST /api/v1/user/profile-picture — Upload profile picture
router.post('/profile-picture', highCostWriteLimiter, verifyToken, uploadProfile.single('file'), userController.uploadProfilePicture);

const requirePermission = require('../../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../../constants/permissions');

// GET /api/v1/user/profile — Get current user's profile
router.get('/profile', verifyToken, userController.getProfile);

// GET /api/v1/user/all — Get all users (RBAC secured)
router.get('/all', verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.READ), userController.getAllUsers);

// GET /api/v1/user/:id — Get user by id (RBAC secured)
router.get('/:id', verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.READ), userController.getUserById);

router.post('/logout', highCostWriteLimiter, verifyToken, userController.logout);

module.exports = router;
