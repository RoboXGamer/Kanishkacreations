import type { APIRoute } from "astro";
import {
    ADMIN_COOKIE_NAME,
    getAdminCookieValue,
    verifyAdminSecret,
} from "../../../lib/admin/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();
    const secret = String(formData.get("secret") || "");
    const next = String(formData.get("next") || "/admin/orders");

    if (!verifyAdminSecret(secret)) {
        return redirect("/admin/login?error=1", 302);
    }

    cookies.set(ADMIN_COOKIE_NAME, getAdminCookieValue(), {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        maxAge: 60 * 60 * 12,
    });

    return redirect(next, 302);
};
