import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConvexHttpClient } from "convex/browser";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const convexUrl = process.env.CONVEX_URL || process.env.PUBLIC_CONVEX_URL || "";

if (!convexUrl) {
  throw new Error("Set CONVEX_URL before running the catalog seed script.");
}

const client = new ConvexHttpClient(convexUrl, {
  skipConvexDeploymentUrlCheck: true,
});

async function readJsonDirectory(relativeDir) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const documents = [];
  for (const fileName of files) {
    const filePath = path.join(absoluteDir, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    documents.push({
      slug: fileName.replace(/\.json$/i, ""),
      data: JSON.parse(raw),
    });
  }

  return documents;
}

async function upsertCategory(slug, category) {
  const existing = await client.query("catalogAdmin:getCategory", { slug });
  const payload = {
    slug,
    title: category.title,
    icon: category.icon,
    sortOrder: category.sortOrder,
    image: category.image,
    buttonLabel: category.buttonLabel,
    summaryItems: category.summaryItems || [],
  };

  if (existing) {
    await client.mutation("catalogAdmin:updateCategory", {
      currentSlug: slug,
      category: payload,
    });
    return;
  }

  await client.mutation("catalogAdmin:createCategory", payload);
}

async function upsertProduct(slug, product) {
  const existing = await client.query("catalogAdmin:getProduct", { slug });
  const payload = {
    slug,
    title: product.title,
    legacyId: product.legacyId,
    categorySlug: product.category,
    priceInr: product.priceInr,
    originalPriceInr: product.originalPriceInr,
    image: product.image,
    badge: product.badge || "",
    isBestSeller: Boolean(product.isBestSeller),
    description: product.description,
    details: product.details || [],
    specifications: product.specifications || [],
    careInstructions: product.careInstructions || [],
  };

  if (existing) {
    await client.mutation("catalogAdmin:updateProduct", {
      currentSlug: slug,
      product: payload,
    });
    return;
  }

  await client.mutation("catalogAdmin:createProduct", payload);
}

async function main() {
  const categories = await readJsonDirectory("src/content/categories");
  for (const category of categories) {
    await upsertCategory(category.slug, category.data);
    console.log(`Seeded category ${category.slug}`);
  }

  const products = await readJsonDirectory("src/content/products");
  for (const product of products) {
    await upsertProduct(product.slug, product.data);
    console.log(`Seeded product ${product.slug}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
