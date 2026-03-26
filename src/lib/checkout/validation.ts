import { z } from "zod";
import {
  formatInr,
  getCategoryMap,
  getProductByIdOrLegacyId,
  getProductHref,
  resolveProductImage,
} from "../catalog";
import type {
  AddressInput,
  CartItemInput,
  EnquiryCustomerInput,
  NormalizedCartItem,
} from "./types";

export const cartItemSchema = z.object({
  productSlug: z.string().min(1),
  quantity: z.number().int().min(1).max(50),
});

export const addressSchema = z.object({
  line1: z.string().min(2),
  line2: z.string().optional().default(""),
  landmark: z.string().optional().default(""),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  country: z.string().min(2).default("India"),
});

export const enquiryCheckoutSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(6),
  address: addressSchema,
  notes: z.string().optional().default(""),
  items: z.array(cartItemSchema).min(1),
});

export async function normalizeCartItems(items: CartItemInput[]): Promise<{
  items: NormalizedCartItem[];
  subtotalInr: number;
  subtotalFormatted: string;
  warnings: string[];
}> {
  const categoryMap = await getCategoryMap();
  const normalizedItems: NormalizedCartItem[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const parsed = cartItemSchema.safeParse(item);
    if (!parsed.success) {
      warnings.push(`Removed an invalid cart line for ${item.productSlug}.`);
      continue;
    }

    const product = await getProductByIdOrLegacyId(parsed.data.productSlug);
    if (!product) {
      warnings.push(`Removed unavailable product ${parsed.data.productSlug}.`);
      continue;
    }

    const lineTotalInr = product.data.priceInr * parsed.data.quantity;
    normalizedItems.push({
      productSlug: product.id,
      productLegacyId: product.data.legacyId,
      productTitle: product.data.title,
      productImage: resolveProductImage(product.data.image),
      unitPriceInr: product.data.priceInr,
      unitPriceFormatted: formatInr(product.data.priceInr),
      quantity: parsed.data.quantity,
      lineTotalInr,
      lineTotalFormatted: formatInr(lineTotalInr),
      productCategory:
        categoryMap.get(product.data.category)?.data.title || "Collection",
      href: getProductHref(product),
    });
  }

  const subtotalInr = normalizedItems.reduce(
    (sum, item) => sum + item.lineTotalInr,
    0,
  );

  return {
    items: normalizedItems,
    subtotalInr,
    subtotalFormatted: formatInr(subtotalInr),
    warnings,
  };
}

export function parseAddress(input: AddressInput) {
  return addressSchema.parse({
    ...input,
    country: input.country || "India",
  });
}

export function parseEnquiryInput(
  input: EnquiryCustomerInput & { items: CartItemInput[] },
) {
  return enquiryCheckoutSchema.parse({
    ...input,
    address: {
      ...input.address,
      country: input.address.country || "India",
    },
    notes: input.notes || "",
  });
}
