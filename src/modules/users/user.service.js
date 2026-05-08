const userModel = require('./user.model');
const storageService = require('../../services/storage.service');

const saveProfile = async (userId, phone, profileData) => {
    if (!userId) {
        throw new Error('User ID (UID) is required to save profile.');
    }

    const mappedData = {};
    if (Object.prototype.hasOwnProperty.call(profileData, 'name') || Object.prototype.hasOwnProperty.call(profileData, 'fullName')) {
        mappedData.fullName = profileData.name ?? profileData.fullName ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(profileData, 'age')) mappedData.age = profileData.age;
    if (Object.prototype.hasOwnProperty.call(profileData, 'gender')) mappedData.gender = profileData.gender;
    if (Object.prototype.hasOwnProperty.call(profileData, 'weight')) mappedData.weight = profileData.weight;
    if (Object.prototype.hasOwnProperty.call(profileData, 'height')) mappedData.height = profileData.height;
    if (Object.prototype.hasOwnProperty.call(profileData, 'profilePicture')) {
        mappedData.profilePicture = profileData.profilePicture ?? null;
    }

    console.log('[UserService] Saving profile for UID:', userId);

    const profile = await userModel.upsertProfile(userId, phone, mappedData);

    console.log('[UserService] Profile saved for UID:', userId);
    return {
        ...profile,
        profilePicture: await storageService.resolvePublicFileUrl(profile.profilePicture),
    };
};

const getProfile = async (userId) => {
    if (!userId) {
        throw new Error('User ID (UID) is required to retrieve profile.');
    }

    console.log('[UserService] Fetching profile for UID:', userId);

    const profile = await userModel.findProfileById(userId);

    if (!profile) {
        console.log('[UserService] Profile not found for UID:', userId);
        return null;
    }

    console.log('[UserService] Profile found for UID:', userId);
    return {
        ...profile,
        profilePicture: await storageService.resolvePublicFileUrl(profile.profilePicture),
    };
};

const getAllUsers = async (filters) => {
    return await userModel.getAllUsers(filters);
};

const getUserById = async (id) => {
    return await userModel.getUserById(id);
};

const updateAdminUser = async (id, profileData = {}) => {
    const mappedData = {};

    if (Object.prototype.hasOwnProperty.call(profileData, 'name') || Object.prototype.hasOwnProperty.call(profileData, 'fullName')) {
        mappedData.fullName = profileData.name ?? profileData.fullName ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(profileData, 'isSuperAdmin')) {
        mappedData.isSuperAdmin = Boolean(profileData.isSuperAdmin);
    }

    if (Object.keys(mappedData).length === 0) {
        return getUserById(id);
    }

    return userModel.updateUserById(id, mappedData);
};

module.exports = {
    saveProfile,
    getProfile,
    getAllUsers,
    getUserById,
    updateAdminUser,
};
