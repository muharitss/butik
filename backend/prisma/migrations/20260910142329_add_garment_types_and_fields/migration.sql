-- CreateTable
CREATE TABLE "garment_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "garment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garment_measurement_fields" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "garment_type_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "garment_measurement_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garment_types_name_key" ON "garment_types"("name");

-- CreateIndex
CREATE INDEX "garment_measurement_fields_garment_type_id_idx" ON "garment_measurement_fields"("garment_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "garment_measurement_fields_garment_type_id_field_key_key" ON "garment_measurement_fields"("garment_type_id", "field_key");

-- AddForeignKey
ALTER TABLE "garment_measurement_fields" ADD CONSTRAINT "garment_measurement_fields_garment_type_id_fkey" FOREIGN KEY ("garment_type_id") REFERENCES "garment_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
