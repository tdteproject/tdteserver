const userService = require('../../users/user.service');
const AssignmentService = require('../assignments/assignment.service');

async function list(req, res, next) {
  try {
    const data = await userService.getAllUsers(req.query);
    return res.json({
      success: true,
      message: 'Users fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await userService.getUserById(req.params.id);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    return res.json({
      success: true,
      message: 'User fetched successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { role_id, roleId, ...profileData } = req.body || {};
    const targetRoleId = role_id || roleId || null;

    const data = await userService.updateAdminUser(req.params.id, profileData);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (targetRoleId) {
      await AssignmentService.assignRoleToUser({
        userId: req.params.id,
        roleId: targetRoleId,
      });
    }

    const refreshed = await userService.getUserById(req.params.id);
    return res.json({
      success: true,
      message: 'User updated successfully',
      data: refreshed || data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  list,
  getOne,
  update,
};
