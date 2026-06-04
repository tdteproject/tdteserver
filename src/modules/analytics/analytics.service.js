const prisma = require('../../config/db');
const ApiError = require('../../core/errors/ApiError');

class AnalyticsService {
  /**
   * Get basic health overview for multiple patients assigned to a doctor.
   */
  async getPatientsOverview(doctorId, date = null) {
    // Treat all users with the 'USER' role as patients accessible to doctors
    const patients = await prisma.profile.findMany({
      where: {
        isSuperAdmin: false, // Exclude super admins
        phone: { not: null }, // Must have registered via app (phone auth)
        userRoles: {
          some: {
            role: {
              code: 'USER',
            },
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        age: true,
        gender: true,
        profilePicture: true,
      },
    });
    const patientIds = patients.map(p => p.id);
    if (patientIds.length === 0) return [];

    // 2. Get the requested day's FitnessActivity for these patients
    const today = date ? new Date(date) : new Date();
    today.setUTCHours(0, 0, 0, 0);

    const fitnessActivities = await prisma.fitnessActivity.findMany({
      where: {
        userId: { in: patientIds },
        date: { gte: today },
      },
    });

    // 3. Get latest heart rate for each
    const heartRates = await prisma.heartRateLog.findMany({
      where: {
        userId: { in: patientIds },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
    });

    // Aggregate data per patient
    const results = patients.map(p => {
      const activity = fitnessActivities.find(s => s.userId === p.id);
      const hr = heartRates.find(h => h.userId === p.id);
      
      return {
        ...p,
        latestMetrics: {
          steps: activity?.steps || 0,
          caloriesBurned: activity?.caloriesBurned || 0,
          heartRate: hr?.bpm || '--',
          activeTimeMinutes: activity?.activeTimeMinutes || 0,
        },
      };
    });

    return results;
  }

  /**
   * Get detailed analytics for a single patient, checking authorization.
   */
  async getPatientDetails(doctorId, patientId, days = 7) {
    // Allow doctor to access any patient's details without explicit assignment

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const fitnessActivities = await prisma.fitnessActivity.findMany({
      where: {
        userId: patientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const summaries = await prisma.healthDailySummary.findMany({
      where: {
        userId: patientId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const sleepSessions = await prisma.sleepSession.findMany({
      where: {
        userId: patientId,
        startTime: { gte: startDate },
      },
      orderBy: { startTime: 'asc' },
    });

    const heartRateLogs = await prisma.heartRateLog.findMany({
      where: {
        userId: patientId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    const patientProfile = await prisma.profile.findUnique({
      where: { id: patientId },
      select: { fullName: true, profilePicture: true, age: true, gender: true }
    });

    return {
      patient: patientProfile,
      summaries: summaries, // Keep for backward compatibility if needed
      fitnessActivities,
      sleepSessions,
      heartRateLogs,
    };
  }
}

module.exports = new AnalyticsService();
