import { ConvexHttpClient } from "convex/browser";

function getConvexUrl() {
  return import.meta.env.CONVEX_URL || "";
}

export function isConvexConfigured() {
  return Boolean(getConvexUrl());
}

function createClient() {
  const url = getConvexUrl();
  if (!url) {
    throw new Error(
      "Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL or PUBLIC_CONVEX_URL.",
    );
  }
  return new ConvexHttpClient(url, {
    skipConvexDeploymentUrlCheck: true,
  });
}

export async function convexQuery<T = unknown>(
  name: string,
  args?: Record<string, unknown>,
) {
  const client = createClient();
  return await client.query(name as any, args || {});
}

export async function convexMutation<T = unknown>(
  name: string,
  args?: Record<string, unknown>,
) {
  const client = createClient();
  return await client.mutation(name as any, args || {});
}
