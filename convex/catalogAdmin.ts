import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

const lineItemValidator = v.object({
  label: v.string(),
  value: v.string(),
});

const categoryInputValidator = v.object({
  slug: v.string(),
  title: v.string(),
  icon: v.string(),
  sortOrder: v.number(),
  image: v.string(),
  buttonLabel: v.string(),
  summaryItems: v.array(v.string()),
});

const productInputValidator = v.object({
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
  details: v.array(lineItemValidator),
  specifications: v.array(lineItemValidator),
  careInstructions: v.array(v.string()),
});

async function assertUniqueCategorySlug(
  ctx: QueryCtx,
  slug: string,
  currentId?: string,
) {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== currentId) {
    throw new Error("A category with that slug already exists.");
  }
}

async function assertUniqueProductSlug(
  ctx: QueryCtx,
  slug: string,
  currentId?: string,
) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (existing && existing._id !== currentId) {
    throw new Error("A product with that slug already exists.");
  }
}

async function assertUniqueLegacyId(
  ctx: QueryCtx,
  legacyId: string,
  currentId?: string,
) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
    .unique();

  if (existing && existing._id !== currentId) {
    throw new Error("A product with that legacy ID already exists.");
  }
}

export const listProducts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_title")
      .take(1000);
    const categories = await ctx.db.query("categories").take(1000);
    const categoryMap = new Map(
      categories.map((category) => [category.slug, category]),
    );

    return products
      .sort((left, right) =>
        left.title.localeCompare(right.title, "en", { sensitivity: "base" }),
      )
      .map((product) => ({
        id: product.slug,
        slug: product.slug,
        title: product.title,
        legacyId: product.legacyId,
        categorySlug: product.categorySlug,
        categoryTitle:
          categoryMap.get(product.categorySlug)?.title ?? "Collection",
        priceInr: product.priceInr,
        originalPriceInr: product.originalPriceInr,
        image: product.image,
        badge: product.badge,
        isBestSeller: product.isBestSeller,
        description: product.description,
        details: product.details,
        specifications: product.specifications,
        careInstructions: product.careInstructions,
      }));
  },
});

export const getProduct = query({
  args: {
    slug: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!product) {
      return null;
    }

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", product.categorySlug))
      .unique();

    return {
      id: product.slug,
      slug: product.slug,
      title: product.title,
      legacyId: product.legacyId,
      categorySlug: product.categorySlug,
      categoryTitle: category?.title ?? "Collection",
      priceInr: product.priceInr,
      originalPriceInr: product.originalPriceInr,
      image: product.image,
      badge: product.badge,
      isBestSeller: product.isBestSeller,
      description: product.description,
      details: product.details,
      specifications: product.specifications,
      careInstructions: product.careInstructions,
    };
  },
});

export const listCategories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_sortOrder")
      .take(1000);

    return categories
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.title.localeCompare(right.title, "en", { sensitivity: "base" }),
      )
      .map((category) => ({
        id: category.slug,
        slug: category.slug,
        title: category.title,
        icon: category.icon,
        sortOrder: category.sortOrder,
        image: category.image,
        buttonLabel: category.buttonLabel,
        summaryItems: category.summaryItems,
      }));
  },
});

export const getCategory = query({
  args: {
    slug: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!category) {
      return null;
    }

    return {
      id: category.slug,
      slug: category.slug,
      title: category.title,
      icon: category.icon,
      sortOrder: category.sortOrder,
      image: category.image,
      buttonLabel: category.buttonLabel,
      summaryItems: category.summaryItems,
    };
  },
});

export const createCategory = mutation({
  args: categoryInputValidator,
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertUniqueCategorySlug(ctx, args.slug);
    return await ctx.db.insert("categories", args);
  },
});

export const updateCategory = mutation({
  args: {
    currentSlug: v.string(),
    category: categoryInputValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.currentSlug))
      .unique();

    if (!category) {
      throw new Error("Category not found.");
    }

    if (args.category.slug !== args.currentSlug) {
      await assertUniqueCategorySlug(ctx, args.category.slug, category._id);
    }

    await ctx.db.patch(category._id, args.category);

    if (args.category.slug !== args.currentSlug) {
      const relatedProducts = await ctx.db
        .query("products")
        .withIndex("by_categorySlug", (q) =>
          q.eq("categorySlug", args.currentSlug),
        )
        .take(1000);

      for (const product of relatedProducts) {
        await ctx.db.patch(product._id, { categorySlug: args.category.slug });
      }
    }

    return category._id;
  },
});

export const deleteCategory = mutation({
  args: {
    slug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!category) {
      throw new Error("Category not found.");
    }

    const relatedProducts = await ctx.db
      .query("products")
      .withIndex("by_categorySlug", (q) => q.eq("categorySlug", args.slug))
      .take(1);

    if (relatedProducts.length > 0) {
      throw new Error(
        "Move or reassign products before deleting this category.",
      );
    }

    await ctx.db.delete(category._id);
    return null;
  },
});

export const createProduct = mutation({
  args: productInputValidator,
  returns: v.string(),
  handler: async (ctx, args) => {
    await assertUniqueProductSlug(ctx, args.slug);
    await assertUniqueLegacyId(ctx, args.legacyId);

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique();

    if (!category) {
      throw new Error("Selected category does not exist.");
    }

    return await ctx.db.insert("products", args);
  },
});

export const updateProduct = mutation({
  args: {
    currentSlug: v.string(),
    product: productInputValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.currentSlug))
      .unique();

    if (!product) {
      throw new Error("Product not found.");
    }

    if (args.product.slug !== args.currentSlug) {
      await assertUniqueProductSlug(ctx, args.product.slug, product._id);
    }

    await assertUniqueLegacyId(ctx, args.product.legacyId, product._id);

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.product.categorySlug))
      .unique();

    if (!category) {
      throw new Error("Selected category does not exist.");
    }

    await ctx.db.patch(product._id, args.product);
    return product._id;
  },
});

export const deleteProduct = mutation({
  args: {
    slug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!product) {
      throw new Error("Product not found.");
    }

    await ctx.db.delete(product._id);
    return null;
  },
});
