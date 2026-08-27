export type HouseRole = "member" | "chef" | "moderator" | "admin";

export type Profile = { id: string; full_name: string | null; email: string | null; role: string };

export const PROFILE_COLUMNS = "id,full_name,email,role";

export function normalizeRole(role?: string | null) {
  return String(role || "member").trim().toLowerCase() as HouseRole;
}
