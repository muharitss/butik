-- CreateTable
CREATE TABLE "measurement_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "label" TEXT,
    "notes" TEXT,
    "measured_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "measurement_version_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "value" DECIMAL(6,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "measurement_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "measurement_versions_customer_id_idx" ON "measurement_versions"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_versions_customer_id_version_number_key" ON "measurement_versions"("customer_id", "version_number");

-- CreateIndex
CREATE INDEX "measurement_values_measurement_version_id_idx" ON "measurement_values"("measurement_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_values_measurement_version_id_field_key_key" ON "measurement_values"("measurement_version_id", "field_key");

-- AddForeignKey
ALTER TABLE "measurement_versions" ADD CONSTRAINT "measurement_versions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_versions" ADD CONSTRAINT "measurement_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurement_values" ADD CONSTRAINT "measurement_values_measurement_version_id_fkey" FOREIGN KEY ("measurement_version_id") REFERENCES "measurement_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
