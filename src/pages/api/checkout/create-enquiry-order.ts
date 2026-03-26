import type { APIRoute } from "astro";
import { convexMutation, isConvexConfigured } from "../../../lib/convex/server";
import { buildEnquiryLinks } from "../../../lib/checkout/messages";
import {
  normalizeCartItems,
  parseEnquiryInput,
} from "../../../lib/checkout/validation";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!isConvexConfigured()) {
    return Response.json(
      {
        ok: false,
        error: "Convex is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    const payload = await request.json();
    const parsed = parseEnquiryInput(payload);
    const normalized = await normalizeCartItems(parsed.items);

    if (normalized.items.length === 0) {
      return Response.json(
        { ok: false, error: "Your cart is empty." },
        { status: 400 },
      );
    }

    const created = await convexMutation<{
      orderId: string;
      orderNumber: string;
    }>("orders:createEnquiryOrder", {
      customerName: parsed.fullName,
      phone: parsed.phone,
      address: parsed.address,
      notes: parsed.notes,
      items: normalized.items.map((item) => ({
        productSlug: item.productSlug,
        productLegacyId: item.productLegacyId,
        productTitleSnapshot: item.productTitle,
        productImageSnapshot: item.productImage,
        unitPriceInr: item.unitPriceInr,
        quantity: item.quantity,
        lineTotalInr: item.lineTotalInr,
        productCategorySnapshot: item.productCategory,
      })),
      subtotalInr: normalized.subtotalInr,
      totalInr: normalized.subtotalInr,
    });

    const links = buildEnquiryLinks({
      orderNumber: created.orderNumber,
      customerName: parsed.fullName,
      address: parsed.address,
      notes: parsed.notes,
      items: normalized.items,
      subtotalInr: normalized.subtotalInr,
      totalInr: normalized.subtotalInr,
    });

    return Response.json({
      ok: true,
      orderId: created.orderId,
      orderNumber: created.orderNumber,
      successUrl: `/checkout/success?order=${created.orderId}`,
      whatsappUrl: links.whatsappUrl,
      emailUrl: links.emailUrl,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create enquiry order.",
      },
      { status: 400 },
    );
  }
};
