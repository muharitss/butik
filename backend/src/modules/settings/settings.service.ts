import { prisma } from "../../infrastructure/prisma/client.js";
import type { StoreSettingsDto } from "./settings.schemas.js";

/**
 * Returns current store settings from the database (singleton row id = 'default').
 * If the row does not exist (e.g. before initial seed), gracefully falls back to env-var defaults.
 */
export async function getStoreSettings(): Promise<StoreSettingsDto> {
  const row = await prisma.storeSettings.findUnique({
    where: { id: "default" }
  });

  if (row) {
    return {
      id: row.id,
      name: row.name,
      tagline: row.tagline,
      address: row.address,
      phone: row.phone,
      whatsappPhone: row.whatsappPhone,
      email: row.email,
      receiptFooter: row.receiptFooter,
      updatedAt: row.updatedAt
    };
  }

  return {
    id: "default",
    name: process.env.BOUTIQUE_NAME || "JahitFlow Boutique",
    tagline: process.env.BOUTIQUE_TAGLINE || "Jasa Jahit & Busana Butik Profesional",
    address: process.env.BOUTIQUE_ADDRESS || "Jl. Mode No. 123, Jakarta Selatan",
    phone: process.env.BOUTIQUE_PHONE || "+62 812-3456-7890",
    whatsappPhone: process.env.BOUTIQUE_WHATSAPP || process.env.BOUTIQUE_PHONE || "+62 812-3456-7890",
    email: process.env.BOUTIQUE_EMAIL || "info@jahitflow.com",
    receiptFooter:
      process.env.BOUTIQUE_RECEIPT_FOOTER ||
      "Terima kasih atas kepercayaan Anda mempercayakan busana impian kepada butik kami.",
    updatedAt: new Date()
  };
}
