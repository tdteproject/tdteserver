const admin = require('../config/firebaseAdmin');
const env = require('../config/env');
const { unauthorized } = require('../utils/apiResponse');

/**
 * auth.middleware.js
 * 
 * Verifies the Firebase Bearer token on incoming requests.
 * On success, attaches the decoded token to req.user (contains uid, phone_number, etc.)
 * On failure, responds with 401 Unauthorized.
 * 
 * Flow:
 *   Mobile App → Firebase Auth → gets idToken with phone_number claim
 *   → sends to backend as: Authorization: Bearer <idToken>
 *   → this middleware calls admin.auth().verifyIdToken()
 *   → decoded token attached to req.user (uid, phone, firebase claims)
 *
 * Data Isolation: All queries are now filtered by phone number for multi-device support.
 * Same phone number logging in from different devices/IPs will see the same data.
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const isUploadAssetRequest = req.baseUrl === '/uploads' || String(req.originalUrl || '').startsWith('/uploads/');
    const queryToken = isUploadAssetRequest ? req.query?.access_token : null;
    const headerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split('Bearer ')[1]
        : null;
    const idToken = headerToken || queryToken || req.headers['x-access-token'];

    if (!idToken) {
        return unauthorized(res, 'No Bearer token provided. Please authenticate first.');
    }

    try {
        if (!admin.apps || admin.apps.length === 0) {
            console.error('[AuthMiddleware] Firebase Admin is not initialized');
            return unauthorized(res, 'Authentication service unavailable. Please try again later.');
        }

        // checkRevoked=true ensures server-side session invalidation works.
        const decodedToken = await admin.auth().verifyIdToken(idToken, true);

        if (decodedToken.auth_time && env.security.authMaxSessionAgeSeconds > 0) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const authAge = nowSeconds - decodedToken.auth_time;
            if (authAge > env.security.authMaxSessionAgeSeconds) {
                return unauthorized(res, 'Session has expired. Please sign in again.');
            }
        }


        // if (
        //     env.security.requireEmailVerified &&
        //     decodedToken.email &&
        //     decodedToken.email_verified === false
        // ) {
        //     return unauthorized(res, 'Email address is not verified. Please verify your email first.');
        // }
        
        // Extract identifier from Firebase token
        const phone = decodedToken.phone_number;
        const email = decodedToken.email;
        
        // Admins use email, regular users use phone. Allow either.
        if (!phone && !email) {
            console.error('[AuthMiddleware] Firebase token missing both phone and email claims');
            return unauthorized(res, 'Token does not contain an identifier (phone or email). Please re-authenticate.');
        }

        // Attach uid, phone, email, and lightweight custom claims to request for use by controllers
        req.user = {
            uid: decodedToken.uid,                                  // Firebase UID
            phone: phone || null,                                   // Phone number (may be null for email users)
            email: email || null,                                   // Email address (may be null for phone users)
            profileId: decodedToken.profileId || decodedToken.uid,   // Fallback to uid if not set
            selectedRoleId: decodedToken.selectedRoleId || null,
            isSuperAdmin: !!decodedToken.isSuperAdmin,
            tenantId: decodedToken.tenantId || null,
            ...decodedToken                                         // Other Firebase claims
        };

        req.auth = {
            tokenExpiresAt: decodedToken.exp,
            authTime: decodedToken.auth_time,
            signInProvider: decodedToken.firebase?.sign_in_provider || null,
        };

        console.log('[AuthMiddleware] Token verified', {
            uid: decodedToken.uid,
            phone,
            provider: req.auth.signInProvider,
            ip: req.ip,
        });
        next();
    } catch (error) {
        console.error('[AuthMiddleware] Token verification failed', {
            code: error.code,
            message: error.message,
            ip: req.ip,
            path: req.originalUrl,
        });

        // Provide helpful error messages based on Firebase error codes
        if (error.code === 'auth/id-token-expired') {
            return unauthorized(res, 'Token has expired. Please sign in again.');
        }
        if (error.code === 'auth/id-token-revoked') {
            return unauthorized(res, 'Session was revoked. Please sign in again.');
        }
        if (error.code === 'auth/argument-error') {
            return unauthorized(res, 'Token format is invalid.');
        }

        return unauthorized(res, 'Token is invalid or expired. Please sign in again.');
    }
};

module.exports = { verifyToken };
