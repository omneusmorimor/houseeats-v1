import React,{useState}from"react";
import V2AdminWorkspace from"./V2AdminWorkspace";
import ChefV2 from"./ChefV2";
import MemberV2Clean from"./MemberV2Clean";

type Mode="admin"|"member"|"chef";
type Props={user:any;profile:any;onSignOut:()=>void};

export default function SuperAdminView({user,profile,onSignOut}:Props){
 const[mode,setMode]=useState<Mode>("admin");
 const activeProfile={...profile,role:mode};
 return <div className="super-admin-shell">
   <div className="super-admin-switcher">
     <div className="super-admin-title"><strong>SUPER ADMIN</strong><span>HouseEats control center</span></div>
     <div className="super-admin-modes">
       <button onClick={()=>setMode("admin")} className={mode==="admin"?"active":""}>View Admin</button>
       <button onClick={()=>setMode("member")} className={mode==="member"?"active":""}>View Member</button>
       <button onClick={()=>setMode("chef")} className={mode==="chef"?"active":""}>View Chef</button>
       <button onClick={onSignOut} className="signout">Sign out</button>
     </div>
   </div>
   {mode==="admin"?<V2AdminWorkspace user={user} profile={activeProfile} onSignOut={onSignOut}/>:mode==="chef"?<ChefV2 user={user} profile={activeProfile}/>:<MemberV2Clean key={mode} user={user} profile={activeProfile}/>} 
 </div>
}
