"use client";

/**
 * Stand-in for phone-number + OTP auth (Section 3: citizens need "no
 * formal login required"). Generates a random per-browser identifier
 * once and persists it in localStorage, played through the API as
 * `citizen_phone_hash`. Swap for real Firebase Auth phone-OTP + a
 * server-side hash of the verified number when wiring up production auth.
 */
const STORAGE_KEY = "lokpulse_citizen_id";

export function getCitizenId(): string {
  if (typeof window === "undefined") return "hash_server";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = "hash_" + crypto.randomUUID().slice(0, 12);
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
