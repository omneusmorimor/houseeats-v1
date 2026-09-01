import React from "react";
import V2Workspace from "./V2Workspace";
import {supabase} from "./lib/supabase";
export type HouseRole="member"|"chef"|"moderator"|"admin";
type Props={role?:string|null;user:any;profile:any};
export default function RoleRouter({role,user,profile}:Props){
 const signOut=async()=>{await supabase.auth.signOut()};
 return <V2Workspace user={user} profile={profile} onSignOut={signOut}/>;
}
