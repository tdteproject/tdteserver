-- CreateTable heart_rate_logs
-- Stores all heart rate measurements with source tracking and confidence scoring
-- Phone-based data isolation via userId foreign key
CREATE TABLE "heart_rate_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'camera',
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heart_rate_logs_pkey" PRIMARY KEY ("id")
);

-- Unique constraint to prevent exact duplicate entries (same user, same timestamp within second)
CREATE UNIQUE INDEX "heart_rate_logs_user_id_created_at_key" ON "heart_rate_logs"("user_id", "created_at");

-- Index for efficient history queries
CREATE INDEX "heart_rate_logs_user_id_idx" ON "heart_rate_logs"("user_id");
CREATE INDEX "heart_rate_logs_created_at_idx" ON "heart_rate_logs"("created_at");
CREATE INDEX "heart_rate_logs_user_id_created_at_idx" ON "heart_rate_logs"("user_id", "created_at" DESC);

-- Foreign key constraint
ALTER TABLE "heart_rate_logs" ADD CONSTRAINT "heart_rate_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
