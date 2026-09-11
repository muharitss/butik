-- CreateTable
CREATE TABLE "revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "fitting_id" UUID,
    "issue" TEXT NOT NULL,
    "requested_change" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revisions_order_id_idx" ON "revisions"("order_id");

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_fitting_id_fkey" FOREIGN KEY ("fitting_id") REFERENCES "fittings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
