import React from "react";
import MemberV2Clean from "./MemberV2Clean";
import ChefV3 from "./ChefV3";
import SuperAdminView from "./SuperAdminView";
import V2AdminWorkspaceClean from "./V2AdminWorkspaceClean";
import {supabase}from"./lib/supabase";
export type HouseRole="member"|"chef"|"moderator"|"admin"|"super_admin";
type Props={role?:string|null;user:any;profile:any};
export default function RoleRouter({role,user,profile}:Props){
 const normalized=String(role||profile?.role||"member").trim().toLowerCase();
 const signOut=async()=>{await supabase.auth.signOut()};
 if(normalized==="super_admin"||normalized==="superadmin")return <SuperAdminView user={user} profile={profile} onSignOut={signOut}/>;
 if(normalized==="admin")return <V2AdminWorkspaceClean user={user} profile={{...profile,role:normalized}} onSignOut={signOut}/>;
 if(normalized==="chef"||normalized==="moderator")return <ChefV3 user={user} profile={{...profile,role:normalized}}/>;
 return <MemberV2Clean user={user} profile={{...profile,role:"member"}}/>;
}
