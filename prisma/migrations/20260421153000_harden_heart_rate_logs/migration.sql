-- Harden heart rate logs with measurement metadata.
ALTER TABLE "heart_rate_logs"
ADD COLUMN IF NOT EXISTS "stable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "samples" INTEGER,
ADD COLUMN IF NOT EXISTS "duration_ms" INTEGER,
ADD COLUMN IF NOT EXISTS "measured_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "device_id" TEXT,
ADD COLUMN IF NOT EXISTS "session_id" TEXT;

CREATE INDEX IF NOT EXISTS "heart_rate_logs_session_id_idx" ON "heart_rate_logs"("session_id");
CREATE INDEX IF NOT EXISTS "heart_rate_logs_device_id_idx" ON "heart_rate_logs"("device_id");
CREATE INDEX IF NOT EXISTS "heart_rate_logs_measured_at_idx" ON "heart_rate_logs"("measured_at");
