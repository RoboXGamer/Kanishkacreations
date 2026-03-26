import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const allowedOrderStatuses = new Set([
  "submitted",
  "awaiting_confirmation",
  "confirmed",
  "cancel_requested",
  "cancelled",
  "completed",
]);

const allowedFulfillmentStatuses = new Set([
  "unstarted",
  "processing",
  "packed",
  "shipped",
  "delivered",
]);

const allowedRefundStatuses = new Set([
  "not_requested",
  "requested",
  "pending",
  "refunded",
  "rejected",
]);

async function appendEvent(
  ctx: any,
  orderId: any,
  eventType: string,
  message: string,
  metadata?: unknown,
) {
  const event: Record<string, unknown> = {
    orderId,
    eventType,
    actorType: "admin",
    message,
    createdAt: new Date().toISOString(),
  };

  if (metadata !== undefined) {
    event.metadata = metadata;
  }

  await ctx.db.insert("orderEvents", event);
}

function buildOrderNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KC-${stamp}-${random}`;
}

function getInitialFulfillmentStatus(orderStatus: string) {
  switch (orderStatus) {
    case "confirmed":
      return "processing";
    case "completed":
      return "delivered";
    default:
      return "unstarted";
  }
}

async function getOrderDetail(ctx: any, order: any) {
  const customer = await ctx.db.get(order.customerId);
  return {
    ...order,
    customer,
    customerName: customer?.fullName ?? "Unknown customer",
  };
}

export const listOrders = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .collect();
    const detailed = await Promise.all(
      orders.map((order: any) => getOrderDetail(ctx, order)),
    );

    return detailed
      .filter((order: any) => {
        if (!args.includeArchived && order.archivedAt) {
          return false;
        }
        const matchesStatus = !args.status || order.orderStatus === args.status;
        const matchesSearch =
          !args.search ||
          order.orderNumber.toLowerCase().includes(args.search.toLowerCase()) ||
          order.customerName.toLowerCase().includes(args.search.toLowerCase());
        const matchesFrom = !args.from || order.createdAt >= args.from;
        const matchesTo =
          !args.to || order.createdAt <= `${args.to}T23:59:59.999Z`;
        return matchesStatus && matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  },
});

function assertStateTransition(
  order: any,
  nextOrderStatus: string,
  nextFulfillmentStatus: string,
) {
  const currentOrderStatus = order.orderStatus;
  const currentFulfillmentStatus = order.fulfillmentStatus;

  if (!allowedOrderStatuses.has(nextOrderStatus)) {
    throw new Error("Invalid order status.");
  }
  if (!allowedFulfillmentStatuses.has(nextFulfillmentStatus)) {
    throw new Error("Invalid fulfillment status.");
  }

  const allowedOrderTransitions: Record<string, string[]> = {
    submitted: [
      "submitted",
      "awaiting_confirmation",
      "confirmed",
      "cancel_requested",
    ],
    awaiting_confirmation: [
      "awaiting_confirmation",
      "confirmed",
      "cancel_requested",
    ],
    confirmed: ["confirmed", "cancel_requested", "completed"],
    cancel_requested: ["cancel_requested", "confirmed", "cancelled"],
    cancelled: ["cancelled"],
    completed: ["completed"],
  };

  const allowedTransitions = allowedOrderTransitions[currentOrderStatus] || [
    currentOrderStatus,
  ];
  if (!allowedTransitions.includes(nextOrderStatus)) {
    throw new Error("Invalid order status transition.");
  }

  if (currentOrderStatus === "cancelled" && nextOrderStatus !== "cancelled") {
    throw new Error("Cancelled orders cannot move to another order status.");
  }

  if (currentOrderStatus === "completed" && nextOrderStatus !== "completed") {
    throw new Error("Completed orders cannot move to another order status.");
  }

  if (
    nextOrderStatus === "cancelled" &&
    nextFulfillmentStatus !== currentFulfillmentStatus
  ) {
    throw new Error("Cancelled orders cannot change fulfillment status.");
  }

  if (
    currentOrderStatus === "cancelled" &&
    nextFulfillmentStatus !== currentFulfillmentStatus
  ) {
    throw new Error("Cancelled orders cannot be fulfilled.");
  }

  if (
    nextOrderStatus === "cancelled" &&
    currentOrderStatus !== "cancel_requested"
  ) {
    throw new Error(
      "Orders can only be cancelled from cancel requested state.",
    );
  }
}

function assertEditableOrder(order: any) {
  if (order.archivedAt) {
    throw new Error("Archived orders must be restored before editing.");
  }
}

export const updateOrderStatuses = mutation({
  args: {
    orderId: v.id("orders"),
    orderStatus: v.optional(v.string()),
    fulfillmentStatus: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    assertEditableOrder(order);

    const nextOrderStatus = args.orderStatus ?? order.orderStatus;
    const nextFulfillmentStatus =
      args.fulfillmentStatus ?? order.fulfillmentStatus;

    assertStateTransition(order, nextOrderStatus, nextFulfillmentStatus);

    await ctx.db.patch(args.orderId, {
      orderStatus: nextOrderStatus as
        | "submitted"
        | "awaiting_confirmation"
        | "confirmed"
        | "cancel_requested"
        | "cancelled"
        | "completed",
      fulfillmentStatus: nextFulfillmentStatus as
        | "unstarted"
        | "processing"
        | "packed"
        | "shipped"
        | "delivered",
      updatedAt: new Date().toISOString(),
    });

    await appendEvent(
      ctx,
      args.orderId,
      "status_updated",
      "Admin updated order status.",
      {
        orderStatus: nextOrderStatus,
        fulfillmentStatus: nextFulfillmentStatus,
      },
    );
    return null;
  },
});

export const resolveCancellation = mutation({
  args: {
    orderId: v.id("orders"),
    action: v.union(
      v.literal("request"),
      v.literal("cancel"),
      v.literal("reject"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    assertEditableOrder(order);

    let nextStatus = order.orderStatus;
    if (args.action === "request") {
      if (
        order.orderStatus !== "submitted" &&
        order.orderStatus !== "awaiting_confirmation" &&
        order.orderStatus !== "confirmed"
      ) {
        throw new Error("Only open orders can request cancellation.");
      }
      nextStatus = "cancel_requested";
    } else if (args.action === "cancel") {
      if (order.orderStatus !== "cancel_requested") {
        throw new Error("Order must be in cancel requested state.");
      }
      nextStatus = "cancelled";
    } else if (args.action === "reject") {
      if (order.orderStatus !== "cancel_requested") {
        throw new Error("Order must be in cancel requested state.");
      }
      nextStatus = "confirmed";
    }

    await ctx.db.patch(args.orderId, {
      orderStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    await appendEvent(
      ctx,
      args.orderId,
      "cancellation_updated",
      `Cancellation flow updated to ${nextStatus}.`,
      { action: args.action },
    );
    return null;
  },
});

export const resolveRefund = mutation({
  args: {
    orderId: v.id("orders"),
    action: v.union(
      v.literal("request"),
      v.literal("pending"),
      v.literal("refund"),
      v.literal("reject"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }
    assertEditableOrder(order);

    let nextStatus = order.refundStatus;
    if (args.action === "request") {
      nextStatus = "requested";
    } else if (args.action === "pending") {
      if (order.refundStatus !== "requested") {
        throw new Error("Refund must be requested first.");
      }
      nextStatus = "pending";
    } else if (args.action === "refund") {
      if (order.refundStatus !== "pending") {
        throw new Error("Refund must be pending first.");
      }
      nextStatus = "refunded";
    } else if (args.action === "reject") {
      if (
        order.refundStatus !== "requested" &&
        order.refundStatus !== "pending"
      ) {
        throw new Error("Refund must be requested or pending first.");
      }
      nextStatus = "rejected";
    }

    if (!allowedRefundStatuses.has(nextStatus)) {
      throw new Error("Invalid refund status.");
    }

    await ctx.db.patch(args.orderId, {
      refundStatus: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    await appendEvent(
      ctx,
      args.orderId,
      "refund_updated",
      `Refund flow updated to ${nextStatus}.`,
      { action: args.action },
    );
    return null;
  },
});

export const createOrderByAdmin = mutation({
  args: {
    customerName: v.string(),
    phone: v.string(),
    address: v.object({
      line1: v.string(),
      line2: v.optional(v.string()),
      landmark: v.optional(v.string()),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    notes: v.optional(v.string()),
    internalAdminNotes: v.optional(v.string()),
    items: v.array(
      v.object({
        productSlug: v.string(),
        productLegacyId: v.string(),
        productTitleSnapshot: v.string(),
        productImageSnapshot: v.string(),
        unitPriceInr: v.number(),
        quantity: v.number(),
        lineTotalInr: v.number(),
        productCategorySnapshot: v.string(),
      }),
    ),
    subtotalInr: v.number(),
    totalInr: v.number(),
    orderStatus: v.optional(v.string()),
  },
  returns: v.object({
    orderId: v.id("orders"),
    orderNumber: v.string(),
    customerId: v.id("customers"),
    addressId: v.id("addresses"),
  }),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const initialOrderStatus = args.orderStatus ?? "submitted";
    const initialFulfillmentStatus =
      getInitialFulfillmentStatus(initialOrderStatus);

    if (args.subtotalInr !== args.totalInr) {
      throw new Error("Order totals must match.");
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
      orderStatus: initialOrderStatus as
        | "submitted"
        | "awaiting_confirmation"
        | "confirmed"
        | "cancel_requested"
        | "cancelled"
        | "completed",
      paymentStatus: "not_applicable",
      refundStatus: "not_requested",
      fulfillmentStatus: initialFulfillmentStatus as
        | "unstarted"
        | "processing"
        | "packed"
        | "shipped"
        | "delivered",
      currency: "INR",
      subtotalInr: args.subtotalInr,
      discountInr: 0,
      shippingInr: 0,
      totalInr: args.totalInr,
      notesFromCustomer: args.notes ?? "",
      internalAdminNotes: args.internalAdminNotes ?? "",
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
      "order_created",
      "Order created from admin dashboard.",
      {
        orderStatus: initialOrderStatus,
        fulfillmentStatus: initialFulfillmentStatus,
      },
    );

    return {
      orderId,
      orderNumber,
      customerId,
      addressId,
    };
  },
});

export const setOrderArchiveState = mutation({
  args: {
    orderId: v.id("orders"),
    action: v.union(v.literal("archive"), v.literal("restore")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found.");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.orderId, {
      archivedAt: args.action === "archive" ? now : null,
      updatedAt: now,
    });

    await appendEvent(
      ctx,
      args.orderId,
      args.action === "archive" ? "order_archived" : "order_restored",
      "admin",
      args.action === "archive"
        ? "Order archived from admin dashboard."
        : "Order restored in admin dashboard.",
    );

    return null;
  },
});
