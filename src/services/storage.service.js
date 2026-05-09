const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');

const LOCAL_PROVIDER = 'local';
const SUPABASE_PROVIDER = 'supabase';
const SUPABASE_REFERENCE_PREFIX = 'supabase://';
const uploadsRoot = path.resolve(process.cwd(), env.uploadsDir);

const MIME_SIGNATURES = {
    'application/pdf': {
        ext: '.pdf',
        matches: (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
    },
    'image/png': {
        ext: '.png',
        matches: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])),
    },
    'image/jpeg': {
        ext: '.jpg',
        matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF,
    },
    'image/jpg': {
        ext: '.jpg',
        matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF,
    },
};

const STORAGE_TARGETS = {
    record: {
        localPrefix: 'health-records',
        bucket: env.storage.recordsBucket,
        filenamePrefix: 'record',
    },
    profile: {
        localPrefix: 'profile-pictures',
        bucket: env.storage.profileBucket,
        filenamePrefix: 'profile',
    },
};

const TARGET_BY_PREFIX = Object.entries(STORAGE_TARGETS).reduce((acc, [targetKey, target]) => {
    acc[target.localPrefix] = targetKey;
    return acc;
}, {});

const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(String(value || ''));

const encodeObjectPath = (objectPath) =>
    String(objectPath || '')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');

const buildSupabaseReference = (bucket, objectPath) => `${SUPABASE_REFERENCE_PREFIX}${bucket}/${objectPath}`;

const parseSupabaseReference = (reference) => {
    const payload = String(reference || '').slice(SUPABASE_REFERENCE_PREFIX.length);
    const firstSlash = payload.indexOf('/');
    if (firstSlash === -1) {
        throw new Error('Invalid Supabase storage reference');
    }

    return {
        bucket: payload.slice(0, firstSlash),
        objectPath: payload.slice(firstSlash + 1),
    };
};

const detectMimeDetails = (file) => {
    const mimeDetails = MIME_SIGNATURES[file?.mimetype];
    if (!mimeDetails) {
        throw new Error('Only PDF, JPG, and PNG files are allowed.');
    }

    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        throw new Error('Uploaded file is empty or unreadable.');
    }

    if (!mimeDetails.matches(file.buffer)) {
        throw new Error('Uploaded file content does not match its declared file type.');
    }

    return mimeDetails;
};

const detectMimeTypeFromReference = (reference) => {
    const extension = path.extname(String(reference || '')).toLowerCase();
    if (extension === '.pdf') return 'application/pdf';
    if (extension === '.png') return 'image/png';
    if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
    throw new Error(`Unsupported file extension for storage migration: ${extension || '(none)'}`);
};

const getStorageProvider = () => {
    const provider = env.storage.provider;
    if (provider === LOCAL_PROVIDER || provider === SUPABASE_PROVIDER) {
        return provider;
    }

    throw new Error(`Unsupported storage provider: ${provider}`);
};

const ensureSupabaseConfig = () => {
    if (!env.storage.supabaseUrl || !env.storage.supabaseServiceRoleKey) {
        throw new Error('Supabase storage is enabled but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.');
    }
};

const createObjectPath = (targetKey, userId, extension) => {
    const target = STORAGE_TARGETS[targetKey];
    const timestamp = Date.now();
    const suffix = crypto.randomBytes(6).toString('hex');
    return `${target.localPrefix}/${userId}/${target.filenamePrefix}_${timestamp}_${suffix}${extension}`;
};

const uploadToSupabase = async (bucket, objectPath, file) => {
    ensureSupabaseConfig();

    if (typeof fetch !== 'function') {
        throw new Error('Supabase storage upload requires a Node.js runtime with fetch support.');
    }

    const url = `${env.storage.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.storage.supabaseServiceRoleKey}`,
            apikey: env.storage.supabaseServiceRoleKey,
            'Content-Type': file.mimetype,
            'Cache-Control': '3600',
            'x-upsert': 'false',
        },
        body: file.buffer,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase upload failed (${response.status}): ${message}`);
    }
};

const uploadBufferToSupabase = async (bucket, objectPath, buffer, mimetype) => {
    ensureSupabaseConfig();

    if (typeof fetch !== 'function') {
        throw new Error('Supabase storage upload requires a Node.js runtime with fetch support.');
    }

    const url = `${env.storage.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.storage.supabaseServiceRoleKey}`,
            apikey: env.storage.supabaseServiceRoleKey,
            'Content-Type': mimetype,
            'Cache-Control': '3600',
            'x-upsert': 'true',
        },
        body: buffer,
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase upload failed (${response.status}): ${message}`);
    }
};

const createSupabaseSignedUrl = async (bucket, objectPath, expiresInSeconds) => {
    ensureSupabaseConfig();

    if (typeof fetch !== 'function') {
        throw new Error('Supabase signed URL generation requires a Node.js runtime with fetch support.');
    }

    const url = `${env.storage.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodeObjectPath(objectPath)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${env.storage.supabaseServiceRoleKey}`,
            apikey: env.storage.supabaseServiceRoleKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase signed URL creation failed (${response.status}): ${message}`);
    }

    const payload = await response.json();
    const signedUrl = payload?.signedURL;
    if (!signedUrl) {
        throw new Error('Supabase signed URL response was missing signedURL.');
    }

    if (/^https?:\/\//i.test(signedUrl)) {
        return signedUrl;
    }

    return `${env.storage.supabaseUrl.replace(/\/$/, '')}/storage/v1${signedUrl}`;
};

const deleteFromSupabase = async (bucket, objectPath) => {
    ensureSupabaseConfig();

    if (typeof fetch !== 'function') {
        throw new Error('Supabase object deletion requires a Node.js runtime with fetch support.');
    }

    const url = `${env.storage.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}`;
    const response = await fetch(url, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${env.storage.supabaseServiceRoleKey}`,
            apikey: env.storage.supabaseServiceRoleKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefixes: [objectPath] }),
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`Supabase object deletion failed (${response.status}): ${message}`);
    }
};

const storeUploadedFile = async (targetKey, userId, file) => {
    if (!userId) {
        throw new Error('User ID is required for file storage.');
    }

    const target = STORAGE_TARGETS[targetKey];
    if (!target) {
        throw new Error(`Unknown storage target: ${targetKey}`);
    }

    const { ext } = detectMimeDetails(file);
    const objectPath = createObjectPath(targetKey, userId, ext);
    const provider = getStorageProvider();

    if (provider === SUPABASE_PROVIDER) {
        await uploadToSupabase(target.bucket, objectPath, file);
        return buildSupabaseReference(target.bucket, objectPath);
    }

    const absolutePath = path.join(uploadsRoot, objectPath);
    ensureDirectory(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, file.buffer);
    return objectPath.replace(/\\/g, '/');
};

const inferTargetKeyFromReference = (reference) => {
    const normalizedReference = String(reference || '').replace(/\\/g, '/').replace(/^\/+/, '');
    const [prefix] = normalizedReference.split('/');
    const targetKey = TARGET_BY_PREFIX[prefix];

    if (!targetKey) {
        throw new Error(`Could not map local storage reference to a Supabase bucket: ${reference}`);
    }

    return { targetKey, objectPath: normalizedReference };
};

const migrateLocalReferenceToSupabase = async (reference) => {
    if (!reference || isAbsoluteUrl(reference) || String(reference).startsWith(SUPABASE_REFERENCE_PREFIX)) {
        return reference;
    }

    const { targetKey, objectPath } = inferTargetKeyFromReference(reference);
    const absolutePath = path.resolve(uploadsRoot, objectPath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`Local file not found for storage migration: ${absolutePath}`);
    }

    const target = STORAGE_TARGETS[targetKey];
    const buffer = fs.readFileSync(absolutePath);
    const mimetype = detectMimeTypeFromReference(objectPath);

    await uploadBufferToSupabase(target.bucket, objectPath, buffer, mimetype);
    return buildSupabaseReference(target.bucket, objectPath);
};

const deleteStoredFile = async (reference) => {
    if (!reference || isAbsoluteUrl(reference)) {
        return;
    }

    if (String(reference).startsWith(SUPABASE_REFERENCE_PREFIX)) {
        const { bucket, objectPath } = parseSupabaseReference(reference);
        await deleteFromSupabase(bucket, objectPath);
        return;
    }

    const absolutePath = path.resolve(uploadsRoot, reference);
    if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
    }
};

const resolvePublicFileUrl = async (reference, options = {}) => {
    if (!reference) {
        return null;
    }

    if (isAbsoluteUrl(reference)) {
        return reference;
    }

    if (String(reference).startsWith(SUPABASE_REFERENCE_PREFIX)) {
        const { bucket, objectPath } = parseSupabaseReference(reference);
        const expiresInSeconds = options.expiresInSeconds || env.storage.signedUrlExpiresSeconds;
        return createSupabaseSignedUrl(bucket, objectPath, expiresInSeconds);
    }

    return `${env.activeBaseUrl}/uploads/${reference}`;

};

module.exports = {
    storeUploadedFile,
    deleteStoredFile,
    resolvePublicFileUrl,
    migrateLocalReferenceToSupabase,
    buildSupabaseReference,
    parseSupabaseReference,
    STORAGE_TARGETS,
    uploadsRoot,
};
