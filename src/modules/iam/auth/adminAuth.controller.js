const {
  sendEmailLoginOtp,
  syncAdminProfileFromToken,
  verifyEmailLoginOtp,
} = require('./adminAuth.service');

async function sendEmailOtp(req, res, next) {
  try {
    const data = await sendEmailLoginOtp({
      email: req.body?.email,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmailOtp(req, res, next) {
  try {
    const data = await verifyEmailLoginOtp({
      email: req.body?.email,
      otp: req.body?.otp,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      message: 'OTP verified successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function syncProfile(req, res, next) {
  try {
    const data = await syncAdminProfileFromToken(req.user);

    return res.json({
      success: true,
      message: 'Admin profile synchronized successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  sendEmailOtp,
  syncProfile,
  verifyEmailOtp,
};
