const assignmentService = require('./assignment.service');
const ApiError = require('../../../core/errors/ApiError');
const { success, created } = require('../../../utils/apiResponse');

const successResponse = (res, data, status, message) =>
  status === 201 ? created(res, data, message) : success(res, data, message);

class AssignmentController {
  // POST /iam/assignments — Admin assigns a patient to a doctor
  async assignPatient(req, res, next) {
    try {
      const { doctorId, patientId } = req.body;
      if (!doctorId || !patientId) throw new ApiError(400, 'doctorId and patientId are required');
      const assignment = await assignmentService.assignPatientToDoctor(doctorId, patientId);
      return successResponse(res, assignment, 201, 'Patient successfully assigned to doctor');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /iam/assignments/:doctorId/:patientId
  async unassignPatient(req, res, next) {
    try {
      const { doctorId, patientId } = req.params;
      await assignmentService.unassignPatient(doctorId, patientId);
      return successResponse(res, null, 200, 'Patient successfully unassigned');
    } catch (error) {
      next(error);
    }
  }

  // GET /iam/assignments/:doctorId/patients
  async getAssignedPatients(req, res, next) {
    try {
      const { doctorId } = req.params;
      const patients = await assignmentService.getAssignedPatients(doctorId);
      return successResponse(res, patients, 200, 'Assigned patients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // GET /iam/assignments/search?phone=+91...
  async searchPatientByPhone(req, res, next) {
    try {
      const { phone } = req.query;
      if (!phone) throw new ApiError(400, 'Phone number is required');
      const patient = await assignmentService.findPatientByPhone(phone);
      if (!patient) throw new ApiError(404, 'No patient found with this phone number');
      return successResponse(res, patient, 200, 'Patient found');
    } catch (error) {
      next(error);
    }
  }

  // GET /iam/assignments/me/permissions — returns the logged-in user's permission codes
  async getMyPermissions(req, res, next) {
    try {
      const userId = req.user?.profileId || req.user?.uid;
      if (!userId) throw new ApiError(401, 'Unauthenticated');
      const permissions = await assignmentService.getPermissionsForUser(userId);
      return successResponse(res, permissions, 200, 'Permissions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // POST /iam/assignments/select-role — user selects one of their assigned roles
  async selectRole(req, res, next) {
    try {
      const userId = req.user?.profileId || req.user?.uid;
      const { roleId } = req.body;
      const result = await assignmentService.selectRole(userId, roleId);
      return successResponse(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  }

  // POST /iam/assignments/assign-role — Admin assigns a role to a user
  async assignRole(req, res, next) {
    try {
      const { userId, roleId } = req.body;
      if (!userId || !roleId) throw new ApiError(400, 'userId and roleId are required');
      const assignment = await assignmentService.assignRoleToUser({ userId, roleId });
      return successResponse(res, assignment, 201, 'Role successfully assigned to user');
    } catch (error) {
      next(error);
    }
  }

  // POST /iam/assignments/unassign-role — Admin removes a role from a user
  async unassignRole(req, res, next) {
    try {
      const { userId, roleId } = req.body;
      if (!userId || !roleId) throw new ApiError(400, 'userId and roleId are required');
      await assignmentService.unassignRoleFromUser(userId, roleId);
      return successResponse(res, null, 200, 'Role successfully unassigned from user');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AssignmentController();
