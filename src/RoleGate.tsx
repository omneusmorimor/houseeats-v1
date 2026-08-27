import React from "react";
import RoleRouter from "./roleRouter";
import { normalizeRole } from "./lib/profiles";

type Props={user:any;profile:any};

export default function RoleGate({user,profile}:Props){
  const role=normalizeRole(profile?.role);
  return <RoleRouter role={role} user={user} profile={profile}/>;
}
