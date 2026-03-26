import type { APIRoute } from "astro";
import {
  convexMutation,
  isConvexConfigured,
} from "../../../../lib/convex/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminCookieValid,
} from "../../../../lib/admin/auth";
import { parseLineItems, splitLines } from "../../../../lib/admin/catalog";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isAdminCookieValid(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return redirect("/admin/login?next=/admin/products", 302);
  }

  if (!isConvexConfigured()) {
    return new Response("Convex not configured.", { status: 503 });
  }

  try {
    const formData = await request.formData();
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const legacyId = String(formData.get("legacyId") || "").trim();
    const categorySlug = String(formData.get("categorySlug") || "").trim();
    const priceInr = Number(formData.get("priceInr") || 0);
    const originalPriceInr = Number(formData.get("originalPriceInr") || 0);
    const image = String(formData.get("image") || "").trim();
    const badge = String(formData.get("badge") || "").trim();
    const isBestSeller = formData.get("isBestSeller") === "on";
    const description = String(formData.get("description") || "").trim();
    const details = parseLineItems(String(formData.get("details") || ""));
    const specifications = parseLineItems(
      String(formData.get("specifications") || ""),
    );
    const careInstructions = splitLines(
      String(formData.get("careInstructions") || ""),
    );

    if (
      !slug ||
      !title ||
      !legacyId ||
      !categorySlug ||
      !image ||
      !description
    ) {
      return new Response("Please fill in the required product fields.", {
        status: 400,
      });
    }

    const createdProductId = await convexMutation<string>(
      "catalogAdmin:createProduct",
      {
        slug,
        title,
        legacyId,
        categorySlug,
        priceInr,
        originalPriceInr,
        image,
        badge,
        isBestSeller,
        description,
        details,
        specifications,
        careInstructions,
      },
    );

    return redirect(`/admin/products/${slug}`, 302);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to create product.",
      { status: 400 },
    );
  }
};
