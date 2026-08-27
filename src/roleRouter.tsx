import React from "react";
import MemberPage from "./pages/MemberPage";
import ChefPage from "./pages/ChefPage";
import AdminPage from "./pages/AdminPage";
import { normalizeRole, type HouseRole } from "./lib/profiles";

export type { HouseRole };

type Props = { role?: string | null; user: any; profile: any };

export default function RoleRouter({ role, user, profile }: Props) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return <AdminPage user={user} profile={profile} />;
  if (normalized === "chef" || normalized === "moderator") return <ChefPage user={user} profile={profile} />;
  return <MemberPage user={user} profile={profile} />;
}
