import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

type CatalogLineItem = {
  label: string;
  value: string;
};

type CategoryDoc = Doc<"categories">;
type ProductDoc = Doc<"products">;

type CategoryRecord = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  sortOrder: number;
  image: string;
  buttonLabel: string;
  summaryItems: string[];
};

type ProductRecord = {
  id: string;
  slug: string;
  title: string;
  legacyId: string;
  category: string;
  categoryTitle: string;
  priceInr: number;
  originalPriceInr: number;
  image: string;
  badge: string;
  isBestSeller: boolean;
  description: string;
  details: CatalogLineItem[];
  specifications: CatalogLineItem[];
  careInstructions: string[];
};

function serializeCategory(category: CategoryDoc): CategoryRecord {
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
}

function serializeProduct(
  product: ProductDoc,
  categoryTitle: string,
): ProductRecord {
  return {
    id: product.slug,
    slug: product.slug,
    title: product.title,
    legacyId: product.legacyId,
    category: product.categorySlug,
    categoryTitle,
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
}

async function getCategoryMap(ctx: QueryCtx) {
  const categories = await ctx.db.query("categories").take(1000);
  return new Map(categories.map((category) => [category.slug, category]));
}

async function getProductsSorted(ctx: QueryCtx) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_title")
    .take(1000);
  return products.sort((left, right) =>
    left.title.localeCompare(right.title, "en", { sensitivity: "base" }),
  );
}

async function getCategoriesSorted(ctx: QueryCtx) {
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_sortOrder")
    .take(1000);

  return categories.sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.title.localeCompare(right.title, "en", { sensitivity: "base" }),
  );
}

async function findProductByIdentifier(ctx: QueryCtx, identifier: string) {
  const bySlug = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", identifier))
    .unique();

  if (bySlug) {
    return bySlug;
  }

  return await ctx.db
    .query("products")
    .withIndex("by_legacyId", (q) => q.eq("legacyId", identifier))
    .unique();
}

export const listCategories = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const categories = await getCategoriesSorted(ctx);
    return categories.map(serializeCategory);
  },
});

export const listProducts = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const products = await getProductsSorted(ctx);
    const categoryMap = await getCategoryMap(ctx);

    return products.map((product) => {
      const category = categoryMap.get(product.categorySlug);
      return serializeProduct(product, category?.title ?? "Collection");
    });
  },
});

export const getProductByIdOrLegacyId = query({
  args: {
    identifier: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const product = await findProductByIdentifier(ctx, args.identifier);
    if (!product) {
      return null;
    }

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", product.categorySlug))
      .unique();

    return serializeProduct(product, category?.title ?? "Collection");
  },
});
