import type { APIRoute } from "astro";
import { convexQuery, isConvexConfigured } from "../../../lib/convex/server";
import { buildEnquiryLinks } from "../../../lib/checkout/messages";
import { formatInr } from "../../../lib/catalog";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
    if (!isConvexConfigured()) {
        return Response.json(
            { ok: false, error: "Convex is not configured." },
            { status: 503 },
        );
    }

    try {
        const order = await convexQuery<any>("orders:getOrderById", {
            orderId: params.id,
        });

        if (!order) {
            return Response.json({ ok: false, error: "Order not found." }, { status: 404 });
        }

        const items = (order.items || []).map((item: any) => ({
            productSlug: item.productSlug,
            productLegacyId: item.productLegacyId,
            productTitle: item.productTitleSnapshot,
            productImage: item.productImageSnapshot,
            unitPriceInr: item.unitPriceInr,
            unitPriceFormatted: formatInr(item.unitPriceInr),
            quantity: item.quantity,
            lineTotalInr: item.lineTotalInr,
            lineTotalFormatted: formatInr(item.lineTotalInr),
            productCategory: item.productCategorySnapshot,
            href: `/products/${item.productSlug}`,
        }));

        const links = buildEnquiryLinks({
            orderNumber: order.orderNumber,
            customerName: order.customer?.fullName || "Customer",
            address: order.address,
            notes: order.notesFromCustomer || "",
            items,
            subtotalInr: order.subtotalInr,
            totalInr: order.totalInr,
        });

        return Response.json({
            ok: true,
            order: {
                ...order,
                items,
                subtotalFormatted: formatInr(order.subtotalInr),
                totalFormatted: formatInr(order.totalInr),
                whatsappUrl: links.whatsappUrl,
                emailUrl: links.emailUrl,
            },
        });
    } catch (error) {
        return Response.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : "Unable to load order.",
            },
            { status: 400 },
        );
    }
};
