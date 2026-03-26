import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const catalogLineItemValidator = v.object({
  label: v.string(),
  value: v.string(),
});

const checkoutModeValidator = v.literal("enquiry");
const orderStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("awaiting_confirmation"),
  v.literal("confirmed"),
  v.literal("cancel_requested"),
  v.literal("cancelled"),
  v.literal("completed"),
);
const paymentStatusValidator = v.literal("not_applicable");
const refundStatusValidator = v.union(
  v.literal("not_requested"),
  v.literal("requested"),
  v.literal("pending"),
  v.literal("refunded"),
  v.literal("rejected"),
);
const fulfillmentStatusValidator = v.union(
  v.literal("unstarted"),
  v.literal("processing"),
  v.literal("packed"),
  v.literal("shipped"),
  v.literal("delivered"),
);

export default defineSchema({
  categories: defineTable({
    slug: v.string(),
    title: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
    image: v.string(),
    buttonLabel: v.string(),
    summaryItems: v.array(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_sortOrder", ["sortOrder"]),
  products: defineTable({
    slug: v.string(),
    title: v.string(),
    legacyId: v.string(),
    categorySlug: v.string(),
    priceInr: v.number(),
    originalPriceInr: v.number(),
    image: v.string(),
    badge: v.string(),
    isBestSeller: v.boolean(),
    description: v.string(),
    details: v.array(catalogLineItemValidator),
    specifications: v.array(catalogLineItemValidator),
    careInstructions: v.array(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_legacyId", ["legacyId"])
    .index("by_categorySlug", ["categorySlug"])
    .index("by_title", ["title"]),
  customers: defineTable({
    customerUid: v.string(),
    fullName: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    source: v.literal("checkout_enquiry"),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_customerUid", ["customerUid"])
    .index("by_email", ["email"])
    .index("by_phone", ["phone"]),
  addresses: defineTable({
    customerId: v.id("customers"),
    line1: v.string(),
    line2: v.optional(v.string()),
    landmark: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    postalCode: v.string(),
    country: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_customerId", ["customerId"]),
  orders: defineTable({
    orderNumber: v.string(),
    customerId: v.id("customers"),
    addressId: v.id("addresses"),
    checkoutMode: checkoutModeValidator,
    orderStatus: orderStatusValidator,
    paymentStatus: paymentStatusValidator,
    refundStatus: refundStatusValidator,
    fulfillmentStatus: fulfillmentStatusValidator,
    currency: v.string(),
    subtotalInr: v.number(),
    discountInr: v.number(),
    shippingInr: v.number(),
    totalInr: v.number(),
    notesFromCustomer: v.optional(v.string()),
    internalAdminNotes: v.optional(v.string()),
    archivedAt: v.optional(v.union(v.string(), v.null())),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_orderNumber", ["orderNumber"])
    .index("by_customerId", ["customerId"])
    .index("by_orderStatus", ["orderStatus"])
    .index("by_createdAt", ["createdAt"]),
  orderItems: defineTable({
    orderId: v.id("orders"),
    productSlug: v.string(),
    productLegacyId: v.string(),
    productTitleSnapshot: v.string(),
    productImageSnapshot: v.string(),
    unitPriceInr: v.number(),
    quantity: v.number(),
    lineTotalInr: v.number(),
    productCategorySnapshot: v.string(),
  }).index("by_orderId", ["orderId"]),
  orderEvents: defineTable({
    orderId: v.id("orders"),
    eventType: v.string(),
    actorType: v.string(),
    actorId: v.optional(v.union(v.string(), v.null())),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  }).index("by_orderId", ["orderId"]),
});
