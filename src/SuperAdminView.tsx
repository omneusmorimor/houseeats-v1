import React,{useState}from"react";
import V2AdminWorkspace from"./V2AdminWorkspace";
import ChefV2 from"./ChefV2";
import MemberV3 from"./MemberV3";

type Mode="admin"|"member"|"chef";
type Props={user:any;profile:any;onSignOut:()=>void};

export default function SuperAdminView({user,profile,onSignOut}:Props){
 const[mode,setMode]=useState<Mode>("member");
 const activeProfile={...profile,role:mode};
 return <div className="super-admin-shell">
   <div className="super-admin-switcher" aria-label="Super admin preview">
     <div className="super-admin-title"><strong>SUPER ADMIN</strong><span>Preview</span></div>
     <div className="super-admin-modes">
       <button onClick={()=>setMode("admin")} className={mode==="admin"?"active":""}>Admin</button>
       <button onClick={()=>setMode("member")} className={mode==="member"?"active":""}>Member</button>
       <button onClick={()=>setMode("chef")} className={mode==="chef"?"active":""}>Chef</button>
       <button onClick={onSignOut} className="signout">Sign out</button>
     </div>
   </div>
   <style>{`
     .super-admin-switcher{display:flex;align-items:center;gap:14px;min-height:52px;padding:7px 12px;background:#071a33;border-bottom:1px solid rgba(213,168,75,.35);color:#fff;overflow-x:auto}
     .super-admin-title{flex:0 0 auto;display:flex;flex-direction:column;min-width:94px;line-height:1.05}
     .super-admin-title strong{font:800 9px/1.1 system-ui;letter-spacing:.14em;color:#e5bd61}
     .super-admin-title span{font:8px/1.1 system-ui;color:#9fb0c1;margin-top:3px}
     .super-admin-modes{display:flex;gap:5px;align-items:center;min-width:max-content}
     .super-admin-modes button{border:1px solid rgba(229,189,97,.45);background:transparent;color:#fff;border-radius:9px;padding:7px 10px;font:700 9px/1 system-ui;white-space:nowrap}
     .super-admin-modes button.active{background:#e1b85d;color:#071a33;border-color:#e1b85d}
     .super-admin-modes button.signout{border-color:rgba(255,255,255,.2);color:#b9c7d4}
     @media(max-width:430px){.super-admin-switcher{gap:8px;padding:6px 9px;min-height:48px}.super-admin-title{min-width:70px}.super-admin-title strong{font-size:8px}.super-admin-title span{font-size:7px}.super-admin-modes button{padding:7px 8px;font-size:8px}}
   `}</style>
   {mode==="admin"?<V2AdminWorkspace user={user} profile={activeProfile} onSignOut={onSignOut}/>:mode==="chef"?<ChefV2 user={user} profile={activeProfile}/>:<MemberV3 key={mode} user={user} profile={activeProfile}/>} 
 </div>
}
