ALTER TABLE "profiles"
ADD COLUMN "email" TEXT,
ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "phone_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
CREATE INDEX "profiles_email_verified_idx" ON "profiles"("email_verified");
CREATE INDEX "profiles_phone_verified_idx" ON "profiles"("phone_verified");
CREATE INDEX "profiles_created_at_idx" ON "profiles"("created_at");

ALTER TABLE "roles"
ADD COLUMN "scope" VARCHAR(30) NOT NULL DEFAULT 'PLATFORM';

CREATE INDEX "roles_scope_idx" ON "roles"("scope");

CREATE TABLE "admin_otp_challenges" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'EMAIL',
    "purpose" VARCHAR(50) NOT NULL DEFAULT 'ADMIN_LOGIN',
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_otp_challenges_email_purpose_created_at_idx"
ON "admin_otp_challenges"("email", "purpose", "created_at");

CREATE INDEX "admin_otp_challenges_expires_at_idx"
ON "admin_otp_challenges"("expires_at");
