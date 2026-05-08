const userService = require('./user.service');
const { success, notFound, badRequest } = require('../../utils/apiResponse');
const admin = require('../../config/firebaseAdmin');
const storageService = require('../../services/storage.service');

const upsertProfile = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const phone = req.user.phone;
        const profileData = req.body;

        console.log('[UserController] Upserting profile for UID:', userId);

        const profile = await userService.saveProfile(userId, phone, profileData);

        console.log('[UserController] Profile saved successfully for UID:', userId);
        return success(res, profile, 'Profile saved successfully');
    } catch (err) {
        console.error('[UserController] Error in upsertProfile:', err.message);
        next(err);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.uid;

        console.log('[UserController] Fetching profile for UID:', userId);

        const profile = await userService.getProfile(userId);

        if (!profile) {
            console.warn('[UserController] Profile not found for UID:', userId);
            return notFound(res, 'Profile not found. Please complete your profile setup.');
        }

        console.log('[UserController] Profile retrieved successfully for UID:', userId);
        return success(res, profile);
    } catch (err) {
        console.error('[UserController] Error in getProfile:', err.message);
        next(err);
    }
};

const uploadProfilePicture = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const phone = req.user.phone;

        if (!req.file) {
            return badRequest(res, 'No file uploaded. Please select a profile picture.');
        }

        const storedReference = await storageService.storeUploadedFile('profile', userId, req.file);

        console.log('[UserController] Profile picture uploaded:', storedReference);

        const profile = await userService.saveProfile(userId, phone, { profilePicture: storedReference });
        const profilePicture = await storageService.resolvePublicFileUrl(profile.profilePicture);

        console.log('[UserController] Profile picture saved successfully');
        return success(
            res,
            {
                profilePicture,
                profile: {
                    ...profile,
                    profilePicture,
                },
            },
            'Profile picture uploaded successfully'
        );
    } catch (err) {
        console.error('[UserController] Error uploading profile picture:', err.message);
        next(err);
    }
};

const logout = async (req, res) => {
    const phone = req.user?.phone;
    const userId = req.user?.uid;
    const sessionId = req.body?.sessionId || null;

    if (userId && admin.apps && admin.apps.length > 0) {
        try {
            await admin.auth().revokeRefreshTokens(userId);
        } catch (error) {
            console.error('[UserController] Failed to revoke refresh tokens', {
                userId,
                error: error.message,
            });
        }
    }

    console.log('[UserController] Logout processed', {
        userId,
        phone,
        sessionId,
        at: new Date().toISOString(),
    });

    return success(res, { loggedOut: true }, 'Logout acknowledged');
};

const getAllUsers = async (req, res, next) => {
    try {
        const filters = {
            search: req.query.search,
            status: req.query.status,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        };
        const users = await userService.getAllUsers(filters);
        return success(res, users);
    } catch (err) {
        next(err);
    }
};

const getUserById = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) return notFound(res, 'User not found');
        return success(res, user);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    upsertProfile,
    getProfile,
    uploadProfilePicture,
    logout,
    getAllUsers,
    getUserById,
};
