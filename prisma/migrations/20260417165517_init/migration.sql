-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "full_name" TEXT,
    "age" INTEGER,
    "gender" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fitness_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "steps" INTEGER NOT NULL DEFAULT 0,
    "step_goal" INTEGER NOT NULL DEFAULT 10000,
    "calories_burned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calories_goal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distance_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hydration_ml" INTEGER NOT NULL DEFAULT 0,
    "hydration_goal_ml" INTEGER NOT NULL DEFAULT 2500,
    "active_time_minutes" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fitness_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fitness_activities_user_id_date_key" ON "fitness_activities"("user_id", "date");

-- AddForeignKey
ALTER TABLE "fitness_activities" ADD CONSTRAINT "fitness_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
