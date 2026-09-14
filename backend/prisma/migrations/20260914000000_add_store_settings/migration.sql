-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "entity_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "whatsapp_phone" TEXT,
    "email" TEXT,
    "receipt_footer" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);
