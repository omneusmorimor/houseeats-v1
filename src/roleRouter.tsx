import React from "react";
import V2Workspace from "./V2Workspace";
import SuperAdminView from "./SuperAdminView";
import {supabase} from "./lib/supabase";
export type HouseRole="member"|"chef"|"moderator"|"admin";
type Props={role?:string|null;user:any;profile:any};
export default function RoleRouter({role,user,profile}:Props){
 const normalized=String(role||"member").trim().toLowerCase();
 const signOut=async()=>{await supabase.auth.signOut()};
 if(normalized==="admin")return <SuperAdminView user={user} profile={profile} onSignOut={signOut}/>;
 return <V2Workspace user={user} profile={profile}/>;
}
