import type { APIRoute } from "astro";
import { isAdminCookieValid, ADMIN_COOKIE_NAME } from "../../../../../lib/admin/auth";
import { convexMutation, isConvexConfigured } from "../../../../../lib/convex/server";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
    if (!isAdminCookieValid(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
        return redirect("/admin/login", 302);
    }
    if (!isConvexConfigured()) {
        return new Response("Convex not configured.", { status: 503 });
    }

    const formData = await request.formData();
    const orderStatus = String(formData.get("orderStatus") || "");
    const fulfillmentStatus = String(formData.get("fulfillmentStatus") || "");
    const note = String(formData.get("note") || "");

    await convexMutation("admin:updateOrderStatuses", {
        orderId: params.id,
        orderStatus: orderStatus || undefined,
        fulfillmentStatus: fulfillmentStatus || undefined,
    });

    if (note) {
        await convexMutation("orders:updateInternalNote", {
            orderId: params.id,
            note,
        });
    }

    return redirect(`/admin/orders/${params.id}`, 302);
};
