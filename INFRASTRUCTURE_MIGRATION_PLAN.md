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
Supabase PostgreSQL
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

## SUPABASE WILL HANDLE
✔ PostgreSQL database (Managed)
✔ File storage (Profiles & Records)
✔ Realtime data sync

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

1. **[ ]** Implement `verifyFirebaseToken()` middleware in `app.js`.
2. **[ ]** Configure `firebase-admin` initialization with Render environment variables.
3. **[ ]** Audit all database tables to ensure foreign keys use `firebase_uid` (or a mapping table).
4. **[ ]** Remove all remaining Supabase Auth logic/client dependencies from frontend and backend.
5. **[ ]** Verify file upload paths are correctly mapping to Firebase identities in Supabase Storage.
