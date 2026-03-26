import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "kc_admin";

function getSecret() {
  return import.meta.env.ADMIN_DASHBOARD_SECRET || "root";
}

function createSignature(secret: string) {
  return createHmac("sha256", secret)
    .update("kc-admin-session-v1")
    .digest("hex");
}

export function isAdminConfigured() {
  return Boolean(getSecret());
}

export function getAdminCookieValue() {
  const secret = getSecret();
  if (!secret) {
    throw new Error("ADMIN_DASHBOARD_SECRET is not configured.");
  }
  return createSignature(secret);
}

export function verifyAdminSecret(candidate: string) {
  const secret = getSecret();
  return Boolean(secret) && candidate === secret;
}

export function isAdminCookieValid(cookieValue?: string | null) {
  const secret = getSecret();
  if (!secret || !cookieValue) {
    return false;
  }

  const expected = Buffer.from(createSignature(secret));
  const received = Buffer.from(cookieValue);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
