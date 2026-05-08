# 🏗️ PDT INFRASTRUCTURE MIGRATION PLAN

> [!IMPORTANT]
> **FINAL ARCHITECTURE DECISION (2026-05-08)**: Firebase Authentication will remain as the permanent identity provider. Decoupling from Supabase Auth is required to prevent session conflicts.

---

# 🏁 FINAL PRODUCTION ARCHITECTURE

```text
React Native App
        ↓
Firebase Authentication
        ↓
Render Hosted Backend API
        ↓
Render PostgreSQL (Managed) OR Supabase PostgreSQL
        ↓
Supabase Storage + Realtime
```

---

# 🧠 UPDATED RESPONSIBILITIES

## FIREBASE WILL HANDLE
✔ Phone authentication
✔ OTP verification
✔ Firebase user identity (UID)
✔ Optional analytics & push notifications

## RENDER BACKEND WILL HANDLE
✔ Business logic & API validation
✔ BLE session handling & watch packet processing
✔ Metrics normalization
✔ **JWT/Session verification (Firebase Admin SDK)**
✔ Database access layer (Prisma)

## DATABASE & STORAGE
✔ **Render PostgreSQL** (Primary DB provided by User)
✔ **Supabase Storage** (Profiles & Records)
✔ **Supabase Realtime** (Optional sync)

---

# 🔥 AUTHENTICATION FLOW (RETAINED)

1. **Client**: Authenticates with Firebase Phone Auth.
2. **Firebase**: Issues an ID Token (JWT).
3. **Client**: Sends ID Token in `Authorization: Bearer <token>` header to Render API.
4. **Render Backend**:
   - Intercepts request via `verifyFirebaseToken` middleware.
   - Verifies token using `firebase-admin` SDK.
   - Extracts `uid` (Firebase UID).
   - Maps `uid` to the database `User` record.
5. **Database**: All records are linked via `firebase_uid`.

---

# 🔐 SECURITY CONFIGURATION

### Backend Environment (Render)
```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="---BEGIN PRIVATE KEY---\n..."
# OR use serviceAccountKey.json path
DATABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Frontend Environment (Expo)
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_API_URL=https://pdt-api.onrender.com
```

---

# 🛠️ PRISMA & DATABASE MAPPING

Ensure the `User` model uses `firebase_uid` as the primary identifier or a unique index:

```prisma
model User {
  id           String   @id @default(cuid())
  firebase_uid String   @unique
  phone        String   @unique
  profile      Profile?
  // ... other relations
}
```

---

# 📅 NEXT STEPS

1. **[x]** Implement `verifyFirebaseToken()` middleware in `app.js` (Implemented as `verifyToken` in `auth.middleware.js`).
2. **[x]** Configure `firebase-admin` initialization with Render environment variables.
3. **[x]** Audit all database tables to ensure foreign keys use `firebase_uid` (Standardized across all core modules).
4. **[ ]** Remove all remaining Supabase Auth logic/client dependencies from frontend and backend.
5. **[x]** Verify file upload paths are correctly mapping to Firebase identities in Supabase Storage.
6. **[x]** Deployment to Render:
   - Backend: [tdteserver](https://github.com/tdteproject/tdteserver)
   - Admin: [PDT-admin](https://github.com/anilkumardesai18/PDT-admin)
   - Frontend: [PDT-frontend](https://github.com/anilkumardesai18/PDT-frontend)
