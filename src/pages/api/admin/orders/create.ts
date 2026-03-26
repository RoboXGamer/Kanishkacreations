import type { APIRoute } from "astro";
import {
  convexMutation,
  isConvexConfigured,
} from "../../../../lib/convex/server";
import {
  isAdminCookieValid,
  ADMIN_COOKIE_NAME,
} from "../../../../lib/admin/auth";
import { normalizeCartItems } from "../../../../lib/checkout/validation";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isAdminCookieValid(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return redirect("/admin/login", 302);
  }

  if (!isConvexConfigured()) {
    return new Response("Convex not configured.", { status: 503 });
  }

  try {
    const formData = await request.formData();
    const customerName = String(formData.get("customerName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const line1 = String(formData.get("line1") || "").trim();
    const line2 = String(formData.get("line2") || "").trim();
    const landmark = String(formData.get("landmark") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const state = String(formData.get("state") || "").trim();
    const postalCode = String(formData.get("postalCode") || "").trim();
    const country = String(formData.get("country") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const internalAdminNotes = String(
      formData.get("internalAdminNotes") || "",
    ).trim();
    const orderStatus = String(formData.get("orderStatus") || "submitted");
    const itemsJson = String(formData.get("itemsJson") || "[]");

    if (
      !customerName ||
      !phone ||
      !line1 ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return new Response("Please fill in the customer and address details.", {
        status: 400,
      });
    }

    const rawItems = JSON.parse(itemsJson);
    const normalized = await normalizeCartItems(rawItems);

    if (normalized.items.length === 0) {
      return new Response("Add at least one item.", { status: 400 });
    }

    const created = await convexMutation<{ orderId: string }>(
      "admin:createOrderByAdmin",
      {
        customerName,
        phone,
        address: {
          line1,
          line2: line2 || undefined,
          landmark: landmark || undefined,
          city,
          state,
          postalCode,
          country,
        },
        notes: notes || undefined,
        internalAdminNotes: internalAdminNotes || undefined,
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
        orderStatus,
      },
    );

    return redirect(`/admin/orders/${created.orderId}`, 302);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to create order.",
      {
        status: 400,
      },
    );
  }
};
