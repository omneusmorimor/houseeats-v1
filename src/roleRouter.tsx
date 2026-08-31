import React from "react";
import MemberPageV2 from "./pages/MemberPageV2";
import ChefPage from "./pages/ChefPage";
import AdminPage from "./pages/AdminPage";

export type HouseRole = "member" | "chef" | "moderator" | "admin";

type Props = { role?: string | null; user: any; profile: any };

export default function RoleRouter({ role, user, profile }: Props) {
  const normalized = String(role || "member").trim().toLowerCase() as HouseRole;
  if (normalized === "admin") return <AdminPage user={user} profile={profile} />;
  if (normalized === "chef" || normalized === "moderator") return <ChefPage user={user} profile={profile} />;
  return <MemberPageV2 user={user} profile={profile} />;
}
