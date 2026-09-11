import type { Prisma } from "@prisma/client";
import { prisma } from "../../infrastructure/prisma/client.js";
import { NotFoundError, ValidationError } from "../../shared/errors/index.js";
import { normalizePhone } from "../customers/customers.rules.js";
import { toMoney, subtract, round } from "../../shared/money/index.js";
import type { WhatsappTemplate, WhatsappLinkResponse } from "./whatsapp.schemas.js";

function formatDateIndo(date: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  } catch {
    return date.toISOString().split("T")[0] || "";
  }
}

function formatIdr(amount: Prisma.Decimal | string | number): string {
  const num = typeof amount === "number" ? amount : Number(amount.toString());
  if (isNaN(num)) return "Rp 0";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export async function generateWhatsappLink(
  orderId: string,
  template: WhatsappTemplate
): Promise<WhatsappLinkResponse> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: true,
      items: {
        include: { garmentType: true },
        orderBy: { id: "asc" }
      }
    }
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const rawPhone = order.customer?.phone;
  const normalizedPhone = normalizePhone(rawPhone);

  if (!normalizedPhone) {
    throw new ValidationError(
      "Customer does not have a valid phone number for WhatsApp communication."
    );
  }

  const boutiqueName = process.env.BOUTIQUE_NAME || "JahitFlow Boutique";
  const boutiqueAddress = process.env.BOUTIQUE_ADDRESS || "Jl. Mode No. 123, Jakarta Selatan";

  const customerName = order.customer.name;
  const orderNumber = order.orderNumber;
  const deadlineStr = formatDateIndo(order.deadlineAt);

  const remainingBalanceDecimal = round(
    subtract(toMoney(order.total.toString()), toMoney(order.paidTotalCache.toString()))
  );
  const remainingNum = Number(remainingBalanceDecimal.toString());
  const isPaid = remainingNum <= 0;

  const formattedTotal = formatIdr(order.total);
  const formattedRemaining = isPaid ? "Rp 0 (LUNAS)" : formatIdr(remainingBalanceDecimal);

  const itemsSummary =
    order.items.length > 0
      ? order.items
          .map((item) => `${item.garmentType?.name || "Busana"} (${item.quantity}x)`)
          .join(", ")
      : "Busana Pesanan";

  let message: string;

  switch (template) {
    case "confirmation":
      message = [
        `Halo Kak ${customerName}, terima kasih telah memesan di ${boutiqueName}.`,
        `Pesanan Anda telah kami konfirmasi:`,
        `• No. Pesanan: ${orderNumber}`,
        `• Item: ${itemsSummary}`,
        `• Estimasi Selesai: ${deadlineStr}`,
        `• Total Biaya: ${formattedTotal}`,
        `• Sisa Tagihan: ${formattedRemaining}`,
        ``,
        `Kami akan mengabari Anda jika busana sudah masuk jadwal fitting atau siap diambil. Terima kasih!`
      ].join("\n");
      break;

    case "ready":
      message = [
        `Halo Kak ${customerName}, kabar gembira! Pesanan busana Anda di ${boutiqueName} sudah selesai dan siap diambil:`,
        `• No. Pesanan: ${orderNumber}`,
        `• Item: ${itemsSummary}`,
        `• Status Pembayaran: ${isPaid ? "LUNAS" : `Sisa ${formattedRemaining}`}`,
        `• Lokasi Pengambilan: ${boutiqueAddress}`,
        ``,
        `Silakan datang ke butik kami pada jam operasional. Sampai jumpa!`
      ].join("\n");
      break;

    case "payment_reminder":
      message = [
        `Halo Kak ${customerName}, kami dari ${boutiqueName} ingin menginformasikan terkait tagihan pesanan Anda:`,
        `• No. Pesanan: ${orderNumber}`,
        `• Sisa Tagihan: ${formattedRemaining}`,
        `• Estimasi Selesai: ${deadlineStr}`,
        ``,
        `Mohon untuk melakukan pelunasan tagihan sesuai jadwal. Terima kasih banyak atas kerja samanya!`
      ].join("\n");
      break;

    default:
      throw new ValidationError(`Unsupported template: ${template}`);
  }

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

  return {
    url,
    template,
    phone: normalizedPhone,
    message
  };
}
