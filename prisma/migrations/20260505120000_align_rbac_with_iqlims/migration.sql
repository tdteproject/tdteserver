DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PermissionScope') THEN
    CREATE TYPE "PermissionScope" AS ENUM ('OWN', 'ALL', 'TEAM');
  END IF;
END $$;

CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "path" VARCHAR(255),
    "parent_id" TEXT,
    "icon" VARCHAR(100),
    "navigation_type" TEXT NOT NULL DEFAULT 'SIDEBAR',
    "is_clickable" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_by" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

INSERT INTO "modules" (
    "id",
    "code",
    "name",
    "description",
    "path",
    "parent_id",
    "icon",
    "navigation_type",
    "is_clickable",
    "is_visible",
    "created_by",
    "updated_by",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT
    pm."id",
    pm."code",
    pm."name",
    pm."description",
    pm."path",
    NULL,
    NULL,
    'SIDEBAR',
    CASE WHEN pm."has_features" THEN false ELSE true END,
    true,
    pm."created_by",
    pm."updated_by",
    pm."sort_order",
    pm."is_active",
    pm."created_at",
    pm."updated_at",
    pm."deleted_at"
FROM "platform_modules" pm;

INSERT INTO "modules" (
    "id",
    "code",
    "name",
    "description",
    "path",
    "parent_id",
    "icon",
    "navigation_type",
    "is_clickable",
    "is_visible",
    "created_by",
    "updated_by",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at",
    "deleted_at"
)
SELECT
    pf."id",
    pf."code",
    pf."name",
    pf."description",
    NULL,
    pf."module_id",
    NULL,
    'SIDEBAR',
    true,
    true,
    pf."created_by",
    pf."updated_by",
    pf."sort_order",
    pf."is_active",
    pf."created_at",
    pf."updated_at",
    pf."deleted_at"
FROM "platform_features" pf;

ALTER TABLE "permissions"
  ADD COLUMN "scope" "PermissionScope" NOT NULL DEFAULT 'ALL';

ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_module_id_fkey";
ALTER TABLE "permissions" DROP CONSTRAINT IF EXISTS "permissions_feature_id_fkey";

UPDATE "permissions"
SET "module_id" = COALESCE("feature_id", "module_id");

DROP INDEX IF EXISTS "permissions_feature_id_idx";
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "feature_id";

CREATE UNIQUE INDEX "modules_code_deleted_at_key" ON "modules"("code", "deleted_at");
CREATE UNIQUE INDEX "modules_path_key" ON "modules"("path");
CREATE INDEX "modules_parent_id_idx" ON "modules"("parent_id");
CREATE INDEX "modules_is_active_idx" ON "modules"("is_active");
CREATE INDEX "modules_sort_order_idx" ON "modules"("sort_order");

ALTER TABLE "modules"
  ADD CONSTRAINT "modules_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "modules"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "permissions"
  ADD CONSTRAINT "permissions_module_id_fkey"
  FOREIGN KEY ("module_id") REFERENCES "modules"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP TABLE IF EXISTS "platform_features";
DROP TABLE IF EXISTS "platform_modules";
