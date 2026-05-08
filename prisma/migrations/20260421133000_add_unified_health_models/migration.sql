-- CreateTable
CREATE TABLE "health_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value_number" DOUBLE PRECISION,
    "value_text" TEXT,
    "unit" TEXT,
    "source_type" TEXT NOT NULL DEFAULT 'manual',
    "device_id" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT,
    "client_event_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_daily_summaries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "value_number" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "value_text" TEXT,
    "unit" TEXT,
    "goal_number" DOUBLE PRECISION,
    "goal_text" TEXT,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_daily_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "step_goal" INTEGER NOT NULL DEFAULT 10000,
    "calories_goal" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "hydration_goal_ml" INTEGER NOT NULL DEFAULT 2500,
    "heart_points_goal" INTEGER NOT NULL DEFAULT 150,
    "sleep_goal_minutes" INTEGER NOT NULL DEFAULT 480,
    "weight_goal" DOUBLE PRECISION,
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_sources" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "device_id" TEXT,
    "device_name" TEXT,
    "platform" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "metadata" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "health_events_user_id_client_event_id_key" ON "health_events"("user_id", "client_event_id");

-- CreateIndex
CREATE INDEX "health_events_user_id_metric_type_captured_at_idx" ON "health_events"("user_id", "metric_type", "captured_at");

-- CreateIndex
CREATE INDEX "health_events_user_id_captured_at_idx" ON "health_events"("user_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "health_daily_summaries_user_id_metric_type_date_key" ON "health_daily_summaries"("user_id", "metric_type", "date");

-- CreateIndex
CREATE INDEX "health_daily_summaries_user_id_metric_type_date_idx" ON "health_daily_summaries"("user_id", "metric_type", "date");

-- CreateIndex
CREATE UNIQUE INDEX "goal_settings_user_id_key" ON "goal_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_sources_user_id_source_type_device_id_key" ON "device_sources"("user_id", "source_type", "device_id");

-- CreateIndex
CREATE INDEX "device_sources_user_id_source_type_idx" ON "device_sources"("user_id", "source_type");

-- AddForeignKey
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_daily_summaries" ADD CONSTRAINT "health_daily_summaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_settings" ADD CONSTRAINT "goal_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_sources" ADD CONSTRAINT "device_sources_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
