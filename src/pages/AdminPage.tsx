import React,{useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import MemberPage from "./MemberPage";
import ChefPage from "./ChefPage";
import AnnouncementForm from "../components/AnnouncementForm";
import {MEAL_COLUMNS,firstErrorMessage,type Meal} from "../lib/meals";
import {PROFILE_COLUMNS,type Profile} from "../lib/profiles";

type Props={user:any;profile:any};
const ASSIGNABLE_ROLES:[string,string][]=[["member","Member"],["chef","Chef"],["moderator","Moderator"],["admin","Admin"]];
const memberIdentity=(m:Profile)=><div><b>{m.full_name||"Unnamed member"}</b><small>{m.email||"No email shown"}</small></div>;
export default function AdminPage({user,profile}:Props){
 const [members,setMembers]=useState<Profile[]>([]),[meals,setMeals]=useState<Meal[]>([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState<string|null>(null),[error,setError]=useState(""),[tab,setTab]=useState("members");
 const [preview,setPreview]=useState<"member"|"chef"|null>(null);
 async function load(){setLoading(true);setError("");const [p,m]=await Promise.all([supabase.from("profiles").select(PROFILE_COLUMNS).order("full_name",{nullsFirst:false}),supabase.from("meals").select(MEAL_COLUMNS).order("meal_date").limit(100)]);if(!p.error)setMembers(p.data||[]);if(!m.error)setMeals((m.data||[])as Meal[]);const loadError=firstErrorMessage(p.error,m.error);if(loadError)setError(loadError);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function changeRole(id:string,role:string){setSaving(id);setError("");const {error:e}=await supabase.from("profiles").update({role}).eq("id",id);if(e)setError(e.message);else setMembers(x=>x.map(m=>m.id===id?{...m,role}:m));setSaving(null)}

 if(preview){return <div className="adminPreview"><div className="previewBar"><strong>Preview Mode</strong><span>Viewing the {preview} experience without changing your Admin role.</span><button onClick={()=>setPreview(null)}>← Back to Admin</button></div>{preview==="member"?<MemberPage user={user} profile={profile} hideMealRatings/>:<ChefPage user={user} profile={profile}/>}</div>}
 return <section className="roleWorkspace adminWorkspace"><div className="roleHero"><span>ADMIN</span><h1>Admin Dashboard</h1><p>Manage members, roles, menus and HouseEats settings.</p><div className="adminPreviewButtons"><button onClick={()=>setPreview("member")}>👤 Preview Member</button><button onClick={()=>setPreview("chef")}>🧑‍🍳 Preview Chef</button></div></div>{error&&<div className="error"><b>Admin action failed</b><span>{error}</span></div>}<nav className="workspaceNav">{[["members","👥 Members"],["roles","🔐 Roles"],["chef","🧑‍🍳 Chef Management"],["menu","🍽️ Menu Oversight"],["notify","🔔 Notifications"],["settings","⚙️ Settings"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}</button>)}</nav>{loading?<div className="message">Loading admin data…</div>:<>
 {tab==="members"&&<div className="adminPanel panel"><div className="heading"><div><h2>Members</h2><p>{members.length} profiles</p></div><button onClick={load}>Refresh</button></div><div className="memberTable">{members.map(m=><div className="memberRow" key={m.id}>{memberIdentity(m)}<span>{m.role}</span></div>)}</div></div>}
 {tab==="roles"&&<div className="adminPanel panel"><h2>Roles</h2><p>Role changes are protected by Supabase permissions.</p><div className="memberTable">{members.map(m=><div className="memberRow" key={m.id}>{memberIdentity(m)}<select value={m.role} disabled={saving===m.id} onChange={e=>changeRole(m.id,e.target.value)}>{ASSIGNABLE_ROLES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}</div></div>}
 {tab==="chef"&&<div className="panel"><h2>Chef Management</h2><div className="roleCards">{members.filter(m=>["chef","moderator"].includes(m.role)).map(m=><div className="roleCard" key={m.id}><b>{m.full_name||"Unnamed"}</b><span>{m.role}</span><small>{m.email||"No email"}</small></div>)}</div></div>}
 {tab==="menu"&&<div className="panel"><h2>Menu Oversight</h2>{meals.length?meals.map(m=><div className="roleCard" key={m.id}><b>{m.meal_date} · {m.meal_type}</b><span>{m.name}</span>{m.allergens?.length>0&&<small>⚠️ {m.allergens.join(", ")}</small>}</div>):<div className="message">No meals found.</div>}</div>}
 {tab==="notify"&&<div className="panel"><AnnouncementForm heading="Notifications"/></div>}
 {tab==="settings"&&<div className="panel"><h2>Settings</h2><div className="message">HouseEats configuration is protected. Additional settings can be added here without weakening role controls.</div></div>}
 </>}</section>}
