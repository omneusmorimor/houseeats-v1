import React from "react";
import RoleRouter from "./roleRouter";

type Props={user:any;profile:any};

export default function RoleGate({user,profile}:Props){
  const role=String(profile?.role||"member").trim().toLowerCase();
  return <RoleRouter role={role} user={user} profile={profile}/>;
}
