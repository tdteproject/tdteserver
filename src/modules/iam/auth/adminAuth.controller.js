const {
  sendEmailLoginOtp,
  sendPhoneLoginOtp,
  syncAdminProfileFromToken,
  verifyEmailLoginOtp,
  verifyPhoneLoginOtp,
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

async function sendPhoneOtp(req, res, next) {
  try {
    const data = await sendPhoneLoginOtp({
      phone: req.body?.phone,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      message: 'SMS OTP sent successfully',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyPhoneOtp(req, res, next) {
  try {
    const data = await verifyPhoneLoginOtp({
      phone: req.body?.phone,
      otp: req.body?.otp,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });

    return res.json({
      success: true,
      message: 'SMS OTP verified successfully',
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
  sendPhoneOtp,
  syncProfile,
  verifyEmailOtp,
  verifyPhoneOtp,
};
