import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE_NAME,
  isAdminCookieValid,
} from "../../../../../lib/admin/auth";
import {
  convexMutation,
  isConvexConfigured,
} from "../../../../../lib/convex/server";

export const prerender = false;

export const POST: APIRoute = async ({
  request,
  cookies,
  params,
  redirect,
}) => {
  if (!isAdminCookieValid(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return redirect("/admin/login", 302);
  }

  if (!isConvexConfigured()) {
    return new Response("Convex not configured.", { status: 503 });
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "archive");

  await convexMutation("admin:setOrderArchiveState", {
    orderId: params.id,
    action: action === "restore" ? "restore" : "archive",
  });

  return redirect(`/admin/orders/${params.id}`, 302);
};
