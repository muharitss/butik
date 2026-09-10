-- CreateTable
CREATE TABLE "order_number_counters" (
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_number_counters_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requires_fitting" BOOLEAN NOT NULL DEFAULT true,
    "order_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMPTZ NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "additional_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "express_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "paid_total_cache" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payment_status_cache" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,
    "cancelled_at" TIMESTAMPTZ,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "garment_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_measurement_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "source_measurement_version_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_by_resnapshot_at" TIMESTAMPTZ,

    CONSTRAINT "order_measurement_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_measurement_snapshot_values" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_measurement_snapshot_id" UUID NOT NULL,
    "field_key" TEXT NOT NULL,
    "value" DECIMAL(6,2) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "order_measurement_snapshot_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_histories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_deadline_at_idx" ON "orders"("deadline_at");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_measurement_snapshots_order_id_idx" ON "order_measurement_snapshots"("order_id");

-- Partial unique index per TASK-013 & ERD:
-- Prisma schema DSL does not support partial unique indexes directly.
-- Ensures only one active (non-superseded) snapshot exists per order.
-- When an order is resnapshotted, the previous snapshot sets superseded_by_resnapshot_at,
-- which allows the new active snapshot row to be inserted without violating uniqueness.
CREATE UNIQUE INDEX "order_measurement_snapshots_order_id_active_unique"
ON "order_measurement_snapshots"("order_id")
WHERE "superseded_by_resnapshot_at" IS NULL;

-- CreateIndex
CREATE INDEX "order_measurement_snapshot_values_order_measurement_snapsho_idx" ON "order_measurement_snapshot_values"("order_measurement_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_measurement_snapshot_values_order_measurement_snapsho_key" ON "order_measurement_snapshot_values"("order_measurement_snapshot_id", "field_key");

-- CreateIndex
CREATE INDEX "order_status_histories_order_id_idx" ON "order_status_histories"("order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_garment_type_id_fkey" FOREIGN KEY ("garment_type_id") REFERENCES "garment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_measurement_snapshots" ADD CONSTRAINT "order_measurement_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_measurement_snapshots" ADD CONSTRAINT "order_measurement_snapshots_source_measurement_version_id_fkey" FOREIGN KEY ("source_measurement_version_id") REFERENCES "measurement_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_measurement_snapshot_values" ADD CONSTRAINT "order_measurement_snapshot_values_order_measurement_snapsh_fkey" FOREIGN KEY ("order_measurement_snapshot_id") REFERENCES "order_measurement_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_histories" ADD CONSTRAINT "order_status_histories_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_histories" ADD CONSTRAINT "order_status_histories_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
