import { prisma } from "../../infrastructure/prisma/client.js";
import { NotFoundError } from "../../shared/errors/index.js";
import { toMoney, subtract, round, formatMoney } from "../../shared/money/index.js";
import { getStoreSettings } from "../settings/index.js";

export interface BoutiqueInfo {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email?: string | null;
}

export interface ReceiptItem {
  id: string;
  garmentTypeName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  notes?: string | null;
}

export interface ReceiptTotals {
  subtotal: string;
  additionalCost: string;
  expressFee: string;
  discount: string;
  total: string;
}

export interface ReceiptPaymentRecord {
  id: string;
  type: string;
  amount: string;
  method?: string | null;
  note?: string | null;
  recordedAt: string;
}

export interface ReceiptPaymentsSummary {
  paidTotal: string;
  remainingBalance: string;
  paymentStatus: string;
  payments: ReceiptPaymentRecord[];
}

export interface ReceiptDTO {
  boutique: BoutiqueInfo;
  orderId: string;
  orderNumber: string;
  orderDate: string;
  deadlineAt: string;
  status: string;
  notes?: string | null;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: ReceiptItem[];
  totals: ReceiptTotals;
  paymentsSummary: ReceiptPaymentsSummary;
  generatedAt: string;
}

export async function getOrderReceipt(orderId: string): Promise<ReceiptDTO> {
  const [order, settings] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: { garmentType: true },
          orderBy: { id: "asc" }
        },
        payments: {
          orderBy: { recordedAt: "asc" }
        }
      }
    }),
    getStoreSettings()
  ]);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const boutique: BoutiqueInfo = {
    name: settings.name,
    tagline: settings.tagline || "",
    address: settings.address || "",
    phone: settings.phone || "",
    email: settings.email
  };

  const remainingBalance = round(
    subtract(toMoney(order.total.toString()), toMoney(order.paidTotalCache.toString()))
  );

  const items: ReceiptItem[] = order.items.map((item) => ({
    id: item.id,
    garmentTypeName: item.garmentType?.name ?? "Item Busana",
    quantity: item.quantity,
    unitPrice: formatMoney(item.unitPrice),
    subtotal: formatMoney(item.subtotal),
    notes: item.notes
  }));

  const payments: ReceiptPaymentRecord[] = order.payments.map((p) => ({
    id: p.id,
    type: p.type,
    amount: formatMoney(p.amount),
    method: p.method,
    note: p.note,
    recordedAt: p.recordedAt.toISOString()
  }));

  return {
    boutique,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderDate: order.orderDate.toISOString(),
    deadlineAt: order.deadlineAt.toISOString(),
    status: order.status,
    notes: order.notes,
    customer: {
      id: order.customer.id,
      name: order.customer.name,
      phone: order.customer.phone,
      email: order.customer.email,
      address: order.customer.address
    },
    items,
    totals: {
      subtotal: formatMoney(order.subtotal),
      additionalCost: formatMoney(order.additionalCost),
      expressFee: formatMoney(order.expressFee),
      discount: formatMoney(order.discount),
      total: formatMoney(order.total)
    },
    paymentsSummary: {
      paidTotal: formatMoney(order.paidTotalCache),
      remainingBalance: formatMoney(remainingBalance),
      paymentStatus: order.paymentStatusCache,
      payments
    },
    generatedAt: new Date().toISOString()
  };
}
