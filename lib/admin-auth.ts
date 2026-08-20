import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "fam_admin_session";

function configuredPassword() {
  return process.env.ADMIN_PASSWORD || "FAM2026";
}

export function isAdminPassword(candidate: string) {
  const expected = Buffer.from(configuredPassword());
  const supplied = Buffer.from(candidate);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function adminSessionToken() {
  return createHash("sha256")
    .update(`fam-admin-session:${configuredPassword()}`)
    .digest("hex");
}

export function isAdminSession(candidate?: string) {
  if (!candidate) return false;
  const expected = Buffer.from(adminSessionToken());
  const supplied = Buffer.from(candidate);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
