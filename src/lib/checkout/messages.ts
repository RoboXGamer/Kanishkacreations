import { formatInr } from "../catalog";
import type { AddressInput, NormalizedCartItem, OrderSummary } from "./types";

function getWhatsappNumber() {
  return import.meta.env.PUBLIC_WHATSAPP_NUMBER || "919355132555";
}

function getSalesEmail() {
  return import.meta.env.PUBLIC_SALES_EMAIL || "sales@kc-creations.in";
}

function formatAddress(address: AddressInput) {
  return [
    address.line1,
    address.line2,
    address.landmark,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export function buildEnquiryMessage(input: {
  orderNumber: string;
  customerName: string;
  phone?: string;
  address: AddressInput;
  notes?: string;
  items: NormalizedCartItem[];
  subtotalInr: number;
  totalInr: number;
}) {
  const lines = [
    `Order Ref: ${input.orderNumber}`,
    `Customer: ${input.customerName}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    `Address: ${formatAddress(input.address)}`,
    "",
    "Items:",
    ...input.items.map(
      (item) =>
        `- ${item.productTitle} x ${item.quantity} = ${formatInr(item.lineTotalInr)}`,
    ),
    "",
    `Subtotal: ${formatInr(input.subtotalInr)}`,
    `Total: ${formatInr(input.totalInr)}`,
  ];

  if (input.notes) {
    lines.push("", `Notes: ${input.notes}`);
  }

  return lines.join("\n");
}

export function buildEnquiryLinks(input: {
  orderNumber: string;
  customerName: string;
  phone?: string;
  address: AddressInput;
  notes?: string;
  items: NormalizedCartItem[];
  subtotalInr: number;
  totalInr: number;
}) {
  const message = buildEnquiryMessage(input);
  const whatsappUrl = `https://wa.me/${getWhatsappNumber()}?text=${encodeURIComponent(message)}`;
  const mailtoSubject = `Kanishka Creations enquiry ${input.orderNumber}`;
  const emailUrl = `mailto:${getSalesEmail()}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(message)}`;

  return {
    whatsappUrl,
    emailUrl,
  };
}

export function buildOrderSummary(
  input: Omit<OrderSummary, "subtotalFormatted" | "totalFormatted">,
): OrderSummary {
  return {
    ...input,
    subtotalFormatted: formatInr(input.subtotalInr),
    totalFormatted: formatInr(input.totalInr),
  };
}
