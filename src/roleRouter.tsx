import React from "react";
import V2Workspace from "./V2Workspace";
import SuperAdminView from "./SuperAdminView";
import {supabase} from "./lib/supabase";
export type HouseRole="member"|"chef"|"moderator"|"admin";
type Props={role?:string|null;user:any;profile:any};
export default function RoleRouter({role,user,profile}:Props){
 const normalized=String(role||profile?.role||"member").trim().toLowerCase();
 const signOut=async()=>{await supabase.auth.signOut()};
 if(normalized==="admin"||normalized==="super_admin"||normalized==="superadmin")return <SuperAdminView user={user} profile={profile} onSignOut={signOut}/>;
 if(normalized==="chef"||normalized==="member"||normalized==="moderator")return <V2Workspace user={user} profile={{...profile,role:normalized}}/>;
 return <V2Workspace user={user} profile={{...profile,role:"member"}}/>;
}
