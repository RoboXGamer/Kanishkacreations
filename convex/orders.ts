import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const orderItemValidator = v.object({
  productSlug: v.string(),
  productLegacyId: v.string(),
  productTitleSnapshot: v.string(),
  productImageSnapshot: v.string(),
  unitPriceInr: v.number(),
  quantity: v.number(),
  lineTotalInr: v.number(),
  productCategorySnapshot: v.string(),
});

const addressValidator = v.object({
  line1: v.string(),
  line2: v.optional(v.string()),
  landmark: v.optional(v.string()),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

function buildOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KC-${stamp}-${random}`;
}

async function appendEvent(
  ctx: any,
  orderId: any,
  eventType: string,
  actorType: string,
  message: string,
  metadata?: unknown,
  actorId?: string | null,
) {
  const event: Record<string, unknown> = {
    orderId,
    eventType,
    actorType,
    message,
    createdAt: new Date().toISOString(),
  };

  if (actorId !== undefined) {
    event.actorId = actorId;
  }
  if (metadata !== undefined) {
    event.metadata = metadata;
  }

  await ctx.db.insert("orderEvents", event);
}

async function getOrderBundle(ctx: any, orderId: any) {
  const order = await ctx.db.get(orderId);
  if (!order) {
    return null;
  }

  const customer = await ctx.db.get(order.customerId);
  const address = await ctx.db.get(order.addressId);
  const orderItems = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();
  const events = await ctx.db
    .query("orderEvents")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();

  return {
    ...order,
    customer,
    address,
    items: orderItems,
    events: events.sort((a: any, b: any) =>
      a.createdAt.localeCompare(b.createdAt),
    ),
  };
}

export const createEnquiryOrder = mutation({
  args: {
    customerName: v.string(),
    phone: v.string(),
    address: addressValidator,
    notes: v.optional(v.string()),
    items: v.array(orderItemValidator),
    subtotalInr: v.number(),
    totalInr: v.number(),
  },
  returns: v.object({
    orderId: v.id("orders"),
    orderNumber: v.string(),
    customerId: v.id("customers"),
    addressId: v.id("addresses"),
  }),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    if (args.subtotalInr !== args.totalInr) {
      throw new Error("Order totals must match for enquiry checkout.");
    }

    const customerId = await ctx.db.insert("customers", {
      customerUid: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      fullName: args.customerName,
      email: null,
      phone: args.phone,
      source: "checkout_enquiry",
      createdAt: now,
      updatedAt: now,
    });

    const addressId = await ctx.db.insert("addresses", {
      customerId,
      ...args.address,
      line2: args.address.line2 ?? "",
      landmark: args.address.landmark ?? "",
      createdAt: now,
      updatedAt: now,
    });

    const orderNumber = buildOrderNumber();
    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      customerId,
      addressId,
      checkoutMode: "enquiry",
      orderStatus: "submitted",
      paymentStatus: "not_applicable",
      refundStatus: "not_requested",
      fulfillmentStatus: "unstarted",
      currency: "INR",
      subtotalInr: args.subtotalInr,
      discountInr: 0,
      shippingInr: 0,
      totalInr: args.totalInr,
      notesFromCustomer: args.notes ?? "",
      internalAdminNotes: "",
      createdAt: now,
      updatedAt: now,
    });

    for (const item of args.items) {
      await ctx.db.insert("orderItems", {
        orderId,
        ...item,
      });
    }

    await appendEvent(
      ctx,
      orderId,
      "order_submitted",
      "customer",
      "Enquiry order submitted from storefront.",
      { orderNumber },
    );

    return {
      orderId,
      orderNumber,
      customerId,
      addressId,
    };
  },
});

export const getOrderById = query({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await getOrderBundle(ctx, args.orderId);
  },
});

export const getOrderByNumber = query({
  args: {
    orderNumber: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_orderNumber", (q: any) =>
        q.eq("orderNumber", args.orderNumber),
      )
      .first();

    if (!order) {
      return null;
    }

    return await getOrderBundle(ctx, order._id);
  },
});

export const updateInternalNote = mutation({
  args: {
    orderId: v.id("orders"),
    note: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.archivedAt) {
      throw new Error("Archived orders must be restored before editing.");
    }

    await ctx.db.patch(args.orderId, {
      internalAdminNotes: args.note,
      updatedAt: new Date().toISOString(),
    });
    await appendEvent(
      ctx,
      args.orderId,
      "internal_note_updated",
      "admin",
      "Internal note updated.",
    );
    return null;
  },
});
