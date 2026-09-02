import React from "react";
import V2RoleWorkspace from "./V2RoleWorkspace";
import ChefV2 from "./ChefV2";
import SuperAdminView from "./SuperAdminView";
import {supabase} from "./lib/supabase";
import "./chef-v2.css";
export type HouseRole="member"|"chef"|"moderator"|"admin";
type Props={role?:string|null;user:any;profile:any};
export default function RoleRouter({role,user,profile}:Props){
 const normalized=String(role||profile?.role||"member").trim().toLowerCase();
 const signOut=async()=>{await supabase.auth.signOut()};
 if(normalized==="admin"||normalized==="super_admin"||normalized==="superadmin")return <SuperAdminView user={user} profile={profile} onSignOut={signOut}/>;
 if(normalized==="chef")return <ChefV2 user={user} profile={{...profile,role:normalized}}/>;
 if(normalized==="moderator")return <ChefV2 user={user} profile={{...profile,role:normalized}}/>;
 return <V2RoleWorkspace user={user} profile={{...profile,role:"member"}}/>;
}
