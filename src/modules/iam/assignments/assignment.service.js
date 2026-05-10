const prisma = require('../../../config/db');
const ApiError = require('../../../core/errors/ApiError');
const { log } = require('../../../utils/auditLogger');

class AssignmentService {
  /**
   * Assigns a patient to a doctor.
   */
  async assignPatientToDoctor(doctorId, patientId) {
    const doctor = await prisma.profile.findUnique({
      where: { id: doctorId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!doctor) throw new ApiError(404, 'Doctor profile not found');

    const hasDoctorRole = doctor.userRoles.some(ur => ur.role.code === 'DOCTOR' && ur.isActive);
    if (!hasDoctorRole) throw new ApiError(400, 'User is not assigned the DOCTOR role');

    const patient = await prisma.profile.findUnique({ where: { id: patientId } });
    if (!patient) throw new ApiError(404, 'Patient profile not found');

    try {
      const assignment = await prisma.doctorPatient.create({
        data: { doctorId, patientId },
      });
      await log({ userId: doctorId, action: 'ASSIGN_PATIENT', module: 'assignments', entityId: patientId, description: `Patient ${patientId} assigned to Doctor ${doctorId}` });
      return assignment;
    } catch (error) {
      if (error.code === 'P2002') throw new ApiError(400, 'Patient is already assigned to this doctor');
      throw error;
    }
  }

  /**
   * Unassigns a patient from a doctor.
   */
  async unassignPatient(doctorId, patientId) {
    try {
      await prisma.doctorPatient.delete({
        where: { doctorId_patientId: { doctorId, patientId } },
      });
      await log({ userId: doctorId, action: 'UNASSIGN_PATIENT', module: 'assignments', entityId: patientId, description: `Patient ${patientId} unassigned from Doctor ${doctorId}` });
      return { success: true };
    } catch (error) {
      if (error.code === 'P2025') throw new ApiError(404, 'Assignment not found');
      throw error;
    }
  }

  /**
   * Gets all patients assigned to a doctor.
   */
  async getAssignedPatients(doctorId) {
    const assignments = await prisma.doctorPatient.findMany({
      where: { doctorId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            age: true,
            gender: true,
            profilePicture: true,
          },
        },
      },
    });
    return assignments.map(a => a.patient);
  }

  /**
   * Checks if a patient is assigned to a specific doctor.
   */
  async isPatientAssignedToDoctor(doctorId, patientId) {
    const assignment = await prisma.doctorPatient.findUnique({
      where: { doctorId_patientId: { doctorId, patientId } },
    });
    return !!assignment;
  }

  /**
   * Finds a patient by phone number.
   */
  async findPatientByPhone(phone) {
    const patient = await prisma.profile.findUnique({
      where: { phone },
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
    return patient;
  }

  /**
   * Gets all permission codes for a user (via their active roles).
   */
  async getPermissionsForUser(userId) {
    if (!userId) return [];

    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, selectedRoleId: true },
    });

    // Super Admin without a forced role gets the wildcard
    if (profile?.isSuperAdmin && !profile?.selectedRoleId) {
      return ['*'];
    }

    // Get active role IDs
    const userRoles = await prisma.userRole.findMany({
      where: { userId, isActive: true, role: { isActive: true, deletedAt: null } },
      select: { roleId: true },
    });

    const roleIds = profile?.selectedRoleId
      ? [profile.selectedRoleId]
      : [...new Set(userRoles.map(r => r.roleId))];

    if (!roleIds.length) return [];

    const rolePerms = await prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIds },
        isActive: true,
        deletedAt: null,
        permission: { deletedAt: null },
      },
      include: { permission: { select: { code: true } } },
    });

    return [...new Set(rolePerms.map(rp => rp.permission.code))];
  }

  /**
   * Assigns a role to a user. Creates the UserRole link if not already present.
   * Replaces any existing active role with the new one (single active role policy).
   */
  async assignRoleToUser({ userId, roleId }) {
    if (!userId || !roleId) throw new ApiError(400, 'userId and roleId are required');

    const [user, role] = await Promise.all([
      prisma.profile.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);

    if (!user) throw new ApiError(404, 'User not found');
    if (!role) throw new ApiError(404, 'Role not found');
    if (!role.isActive || role.deletedAt) throw new ApiError(400, 'Role is not active');

    // Upsert the role assignment
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: { isActive: true },
      create: { userId, roleId, isActive: true },
    });

    await log({
      userId,
      action: 'ASSIGN_ROLE',
      module: 'assignments',
      entityId: roleId,
      description: `Role '${role.name}' assigned to user ${userId}`,
    });

    return { success: true, role: { id: role.id, name: role.name, code: role.code } };
  }

  /**
   * Sets the active role for a user (updates selectedRoleId).
   */
  async selectRole(userId, roleId) {
    if (!userId) throw new ApiError(401, 'Unauthenticated');
    
    // If roleId is null, we clear the selection (reverts to all assigned roles)
    if (!roleId) {
      await prisma.profile.update({
        where: { id: userId },
        data: { selectedRoleId: null },
      });
      return { success: true, message: 'Role selection cleared' };
    }

    // Verify the user actually has this role assigned and active
    const userRole = await prisma.userRole.findFirst({
      where: { userId, roleId, isActive: true, role: { isActive: true, deletedAt: null } },
      include: { role: true },
    });

    if (!userRole) {
      throw new ApiError(403, 'You are not assigned this role');
    }

    await prisma.profile.update({
      where: { id: userId },
      data: { selectedRoleId: roleId },
    });

    return { 
      success: true, 
      message: `Role switched to ${userRole.role.name}`,
      role: { id: roleId, name: userRole.role.name, code: userRole.role.code }
    };
  }
}

module.exports = new AssignmentService();
