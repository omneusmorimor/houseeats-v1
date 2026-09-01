import React,{useState}from"react";
import V2Workspace from"./V2Workspace";

type Mode="admin"|"member"|"chef";
type Props={user:any;profile:any;onSignOut:()=>void};

export default function SuperAdminView({user,profile,onSignOut}:Props){
 const[mode,setMode]=useState<Mode>("admin");
 const activeProfile={...profile,role:mode};
 return <div style={{minHeight:"100vh"}}>
   <div style={{position:"sticky",top:0,zIndex:50,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#081b3a",color:"white",borderBottom:"1px solid rgba(212,175,55,.45)",boxShadow:"0 4px 18px rgba(0,0,0,.12)"}}>
     <strong style={{marginRight:"auto",letterSpacing:1}}>SUPER ADMIN</strong>
     <button onClick={()=>setMode("admin")} style={button(mode==="admin")}>Admin</button>
     <button onClick={()=>setMode("member")} style={button(mode==="member")}>Member</button>
     <button onClick={()=>setMode("chef")} style={button(mode==="chef")}>Chef</button>
     <button onClick={onSignOut} style={{...button(false),marginLeft:4}}>Sign out</button>
   </div>
   <V2Workspace key={mode} user={user} profile={activeProfile}/>
 </div>
}

function button(active:boolean):React.CSSProperties{return{border:"1px solid rgba(212,175,55,.65)",background:active?"#d4af37":"transparent",color:active?"#081b3a":"white",borderRadius:999,padding:"7px 11px",fontWeight:700,cursor:"pointer"}}
