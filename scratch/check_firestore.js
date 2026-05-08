const admin = require('../src/config/firebaseAdmin');

async function checkUrl() {
    try {
        const db = admin.firestore();
        const docSnap = await db.collection('remoteConfig').doc('urls').get();
        if (docSnap.exists) {
            console.log('Firestore URL:', docSnap.data());
        } else {
            console.log('Document not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUrl();
