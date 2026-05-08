// Health Record Categories
const RECORD_CATEGORIES = Object.freeze({
    BLOOD_TEST: 'Blood Test',
    XRAY: 'X-Ray',
    MRI: 'MRI',
    PRESCRIPTION: 'Prescription',
    VACCINATION: 'Vaccination',
    OTHER: 'Other',
});

// User gender options
const GENDER = Object.freeze({
    MALE: 'male',
    FEMALE: 'female',
    OTHER: 'other',
    PREFER_NOT_TO_SAY: 'prefer_not_to_say',
});

// Allowed MIME types for health record uploads
const ALLOWED_MIME_TYPES = Object.freeze([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
]);

// Multi-source fitness data sources
const DATA_SOURCE = Object.freeze({
    PHONE: 'PHONE',
    WATCH: 'WATCH',
    HEALTH_CONNECT: 'HEALTH_CONNECT',
});

const DATA_SOURCE_PRIORITY = Object.freeze({
    [DATA_SOURCE.WATCH]: 3,
    [DATA_SOURCE.HEALTH_CONNECT]: 2,
    [DATA_SOURCE.PHONE]: 1,
});

module.exports = {
    RECORD_CATEGORIES,
    GENDER,
    ALLOWED_MIME_TYPES,
    DATA_SOURCE,
    DATA_SOURCE_PRIORITY,
};
