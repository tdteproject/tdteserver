-- Create sleep session storage if it does not already exist.
CREATE TABLE IF NOT EXISTS "sleep_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "movement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quality" TEXT,
    "interruptions" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'phone_accel',
    "metadata" JSONB,
    "client_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sleep_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "sleep_sessions_client_session_id_key" ON "sleep_sessions"("client_session_id");
CREATE INDEX IF NOT EXISTS "sleep_sessions_user_id_idx" ON "sleep_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sleep_sessions_user_id_start_time_idx" ON "sleep_sessions"("user_id", "start_time");
CREATE INDEX IF NOT EXISTS "sleep_sessions_start_time_idx" ON "sleep_sessions"("start_time");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'sleep_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE "sleep_sessions"
        ADD CONSTRAINT "sleep_sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create GPS session storage if it does not already exist.
CREATE TABLE IF NOT EXISTS "gps_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration_sec" INTEGER NOT NULL,
    "distance_meters" DOUBLE PRECISION NOT NULL,
    "avg_speed_kmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "max_speed_kmh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_pace_min_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calories_burned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "client_session_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gps_sessions_client_session_id_key" ON "gps_sessions"("client_session_id");
CREATE INDEX IF NOT EXISTS "gps_sessions_user_id_idx" ON "gps_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "gps_sessions_user_id_start_time_idx" ON "gps_sessions"("user_id", "start_time");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gps_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE "gps_sessions"
        ADD CONSTRAINT "gps_sessions_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create GPS route storage if it does not already exist.
CREATE TABLE IF NOT EXISTS "gps_routes" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gps_routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gps_routes_session_id_idx" ON "gps_routes"("session_id");
CREATE INDEX IF NOT EXISTS "gps_routes_session_id_timestamp_idx" ON "gps_routes"("session_id", "timestamp");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gps_routes_session_id_fkey'
    ) THEN
        ALTER TABLE "gps_routes"
        ADD CONSTRAINT "gps_routes_session_id_fkey"
        FOREIGN KEY ("session_id") REFERENCES "gps_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
