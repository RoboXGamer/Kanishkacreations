import type { APIRoute } from "astro";
import { normalizeCartItems } from "../../../lib/checkout/validation";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const normalized = await normalizeCartItems(body.items || []);

        return Response.json({
            ok: true,
            ...normalized,
            totalInr: normalized.subtotalInr,
            totalFormatted: normalized.subtotalFormatted,
        });
    } catch (error) {
        return Response.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Invalid cart payload.",
            },
            { status: 400 },
        );
    }
};
