-- CreateTable
CREATE TABLE "fittings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "fitting_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMPTZ,
    "occurred_at" TIMESTAMPTZ,
    "result" TEXT,
    "notes" TEXT,
    "next_action" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fittings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fittings_order_id_idx" ON "fittings"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "fittings_order_id_fitting_number_key" ON "fittings"("order_id", "fitting_number");

-- AddForeignKey
ALTER TABLE "fittings" ADD CONSTRAINT "fittings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
