import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function createCustomerUid() {
  return `cust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const upsertGuestCustomer = mutation({
  args: {
    fullName: v.string(),
    email: v.optional(v.union(v.string(), v.null())),
    phone: v.optional(v.union(v.string(), v.null())),
    source: v.literal("checkout_enquiry"),
  },
  returns: v.object({
    customerId: v.id("customers"),
    customerUid: v.string(),
  }),
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const customerId = await ctx.db.insert("customers", {
      customerUid: createCustomerUid(),
      fullName: args.fullName,
      email: args.email ?? null,
      phone: args.phone ?? null,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });
    const customer = await ctx.db.get(customerId);
    return {
      customerId,
      customerUid: customer?.customerUid ?? "",
    };
  },
});

export const getCustomerById = query({
  args: {
    customerId: v.id("customers"),
  },
  returns: v.union(
    v.object({
      _id: v.id("customers"),
      _creationTime: v.number(),
      customerUid: v.string(),
      fullName: v.string(),
      email: v.optional(v.union(v.string(), v.null())),
      phone: v.optional(v.union(v.string(), v.null())),
      source: v.literal("checkout_enquiry"),
      createdAt: v.string(),
      updatedAt: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.customerId)) ?? null;
  },
});
