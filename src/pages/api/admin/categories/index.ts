import type { APIRoute } from "astro";
import {
  convexMutation,
  isConvexConfigured,
} from "../../../../lib/convex/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminCookieValid,
} from "../../../../lib/admin/auth";
import { splitLines } from "../../../../lib/admin/catalog";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  if (!isAdminCookieValid(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return redirect("/admin/login?next=/admin/categories", 302);
  }

  if (!isConvexConfigured()) {
    return new Response("Convex not configured.", { status: 503 });
  }

  try {
    const formData = await request.formData();
    const slug = String(formData.get("slug") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const icon = String(formData.get("icon") || "").trim();
    const sortOrder = Number(formData.get("sortOrder") || 1);
    const image = String(formData.get("image") || "").trim();
    const buttonLabel = String(formData.get("buttonLabel") || "").trim();
    const summaryItems = splitLines(String(formData.get("summaryItems") || ""));

    if (!slug || !title || !icon || !image || !buttonLabel) {
      return new Response("Please fill in the required category fields.", {
        status: 400,
      });
    }

    await convexMutation("catalogAdmin:createCategory", {
      slug,
      title,
      icon,
      sortOrder,
      image,
      buttonLabel,
      summaryItems,
    });

    return redirect(`/admin/categories/${slug}`, 302);
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Unable to create category.",
      { status: 400 },
    );
  }
};
