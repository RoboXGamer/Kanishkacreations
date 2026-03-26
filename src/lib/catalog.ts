import { convexQuery, isConvexConfigured } from "./convex/server";

type ProductImageModule = { src: string } | string;

type CategorySeed = {
  title: string;
  icon: string;
  sortOrder: number;
  image: string;
  buttonLabel: string;
  summaryItems: string[];
};

type ProductSeed = {
  title: string;
  legacyId: string;
  category: string;
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

const productImageModules = import.meta.glob(
  "../assets/products/*.{jpg,jpeg,png,webp,avif}",
  {
    eager: true,
    import: "default",
  },
) as Record<string, ProductImageModule>;

const productImageMap = new Map(
  Object.entries(productImageModules).map(([path, asset]) => {
    const fileName = path.split("/").pop() ?? path;
    const source = typeof asset === "string" ? asset : asset.src;
    return [fileName, source];
  }),
);

const localCategoryModules = import.meta.glob("../content/categories/*.json", {
  eager: true,
  import: "default",
}) as Record<string, CategorySeed>;

const localProductModules = import.meta.glob("../content/products/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ProductSeed>;

type CatalogLineItem = { label: string; value: string };

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

export type CategoryEntry = {
  id: string;
  slug: string;
  data: {
    title: string;
    icon: string;
    sortOrder: number;
    image: string;
    buttonLabel: string;
    summaryItems: string[];
  };
};

export type ProductEntry = {
  id: string;
  slug: string;
  data: {
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
};

function toCategoryEntry(category: CategoryRecord): CategoryEntry {
  return {
    id: category.id,
    slug: category.slug,
    data: {
      title: category.title,
      icon: category.icon,
      sortOrder: category.sortOrder,
      image: category.image,
      buttonLabel: category.buttonLabel,
      summaryItems: category.summaryItems,
    },
  };
}

function toProductEntry(product: ProductRecord): ProductEntry {
  return {
    id: product.id,
    slug: product.slug,
    data: {
      title: product.title,
      legacyId: product.legacyId,
      category: product.category,
      categoryTitle: product.categoryTitle,
      priceInr: product.priceInr,
      originalPriceInr: product.originalPriceInr,
      image: product.image,
      badge: product.badge,
      isBestSeller: product.isBestSeller,
      description: product.description,
      details: product.details,
      specifications: product.specifications,
      careInstructions: product.careInstructions,
    },
  };
}

function loadLocalCategories() {
  return Object.entries(localCategoryModules)
    .map(([path, category]) => {
      const slug =
        path
          .split("/")
          .pop()
          ?.replace(/\.json$/, "") || "";
      return {
        id: slug,
        slug,
        data: {
          title: category.title,
          icon: category.icon,
          sortOrder: category.sortOrder,
          image: category.image,
          buttonLabel: category.buttonLabel,
          summaryItems: category.summaryItems,
        },
      } satisfies CategoryEntry;
    })
    .sort((left, right) => left.data.sortOrder - right.data.sortOrder);
}

function loadLocalProducts() {
  return Object.entries(localProductModules).map(([path, product]) => {
    const slug =
      path
        .split("/")
        .pop()
        ?.replace(/\.json$/, "") || "";
    return {
      id: slug,
      slug,
      data: {
        title: product.title,
        legacyId: product.legacyId,
        category: product.category,
        categoryTitle: product.category,
        priceInr: product.priceInr,
        originalPriceInr: product.originalPriceInr,
        image: product.image,
        badge: product.badge,
        isBestSeller: product.isBestSeller,
        description: product.description,
        details: product.details,
        specifications: product.specifications,
        careInstructions: product.careInstructions,
      },
    } satisfies ProductEntry;
  });
}

async function queryCategories() {
  if (!isConvexConfigured()) {
    return loadLocalCategories();
  }

  try {
    const categories = await convexQuery<CategoryRecord[]>(
      "catalog:listCategories",
    );
    return categories.map(toCategoryEntry);
  } catch {
    return loadLocalCategories();
  }
}

async function queryProducts() {
  if (!isConvexConfigured()) {
    return loadLocalProducts();
  }

  try {
    const products = await convexQuery<ProductRecord[]>("catalog:listProducts");
    return products.map(toProductEntry);
  } catch {
    return loadLocalProducts();
  }
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getProductHref(product: ProductEntry) {
  return `/products/${product.id}`;
}

export async function getCategories() {
  return await queryCategories();
}

export async function getCategoryMap() {
  const categories = await getCategories();
  return new Map(categories.map((category) => [category.id, category]));
}

export async function getProducts() {
  return await queryProducts();
}

export function resolveProductImage(image: string) {
  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const fileName = image.split("/").pop() ?? image;
  return productImageMap.get(fileName) ?? image;
}

export async function getProductByIdOrLegacyId(identifier: string | null) {
  if (!identifier) {
    return undefined;
  }

  if (!isConvexConfigured()) {
    return loadLocalProducts().find(
      (product) =>
        product.id === identifier || product.data.legacyId === identifier,
    );
  }

  let product: ProductRecord | null;
  try {
    product = await convexQuery<ProductRecord | null>(
      "catalog:getProductByIdOrLegacyId",
      { identifier },
    );
  } catch {
    return loadLocalProducts().find(
      (entry) => entry.id === identifier || entry.data.legacyId === identifier,
    );
  }

  return product ? toProductEntry(product) : undefined;
}
