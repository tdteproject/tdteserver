const router = require('express').Router();

const { PERMISSIONS } = require('../../../constants/permissions');
const { verifyToken } = require('../../../middlewares/auth.middleware');
const requirePermission = require('../../../middlewares/rbac.middleware');
const controller = require('./user.controller');

router.get('/', verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.READ), controller.list);
router.get('/:id', verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.READ), controller.getOne);
router.put('/:id', verifyToken, requirePermission(PERMISSIONS.RBAC.USERS.UPDATE), controller.update);

module.exports = router;
