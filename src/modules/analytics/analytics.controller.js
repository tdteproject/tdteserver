const analyticsService = require('./analytics.service');
const { success } = require('../../utils/apiResponse');
const ApiError = require('../../core/errors/ApiError');

const successResponse = (res, data, status, message) => success(res, data, message);

class AnalyticsController {
  async getPatientsOverview(req, res, next) {
    try {
      const doctorId = req.user.uid; // Assuming the logged-in user is the doctor
      const overview = await analyticsService.getPatientsOverview(doctorId);
      return successResponse(res, overview, 200, 'Patients overview retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getPatientDetails(req, res, next) {
    try {
      const doctorId = req.user.uid;
      const { patientId } = req.params;
      const days = parseInt(req.query.days) || 7;
      
      const details = await analyticsService.getPatientDetails(doctorId, patientId, days);
      return successResponse(res, details, 200, 'Patient analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
