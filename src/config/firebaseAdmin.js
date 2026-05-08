const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// ─── Firebase Admin SDK Initialization ────────────────────────────────────────
// Supports two credential strategies:
//   Option A: FIREBASE_SERVICE_ACCOUNT_PATH — local JSON file (development)
//   Option B: FIREBASE_SERVICE_ACCOUNT_JSON — inline JSON string (Docker/cloud)
//
// The service account file can be downloaded from:
//   Firebase Console → Project Settings → Service Accounts → Generate New Private Key

if (!admin.apps.length) {
    try {
        let credential;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            // Option B: Inline JSON string from environment variable
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            credential = admin.credential.cert(serviceAccount);
            console.log('[Firebase Admin] Initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var.');
        } else {
            // Option A: Local JSON file
            const keyPath = path.resolve(
                __dirname,
                '../../',
                process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'serviceAccountKey.json'
            );

            if (!fs.existsSync(keyPath)) {
                throw new Error(
                    `serviceAccountKey.json not found at: ${keyPath}\n` +
                    'Download it from: Firebase Console → Project Settings → Service Accounts'
                );
            }

            const serviceAccount = require(keyPath);
            credential = admin.credential.cert(serviceAccount);
            console.log(`[Firebase Admin] Initialized from file: ${keyPath}`);
        }

        admin.initializeApp({ credential });
        admin.__pdtInitialized = true;
        admin.__pdtInitializationError = null;
    } catch (error) {
        admin.__pdtInitialized = false;
        admin.__pdtInitializationError = error.message;
        console.error('[Firebase Admin] Initialization FAILED:', error.message);
        // In production/cloud, fail fast because authenticated routes cannot function safely.
        if (process.env.NODE_ENV === 'production' || (process.env.APP_ENV || 'local') === 'cloud') {
            throw error;
        }
    }
}

module.exports = admin;
