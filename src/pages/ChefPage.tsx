import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const allergens=["Milk","Eggs","Wheat","Soy","Peanuts","Tree Nuts","Fish","Shellfish","Sesame"];
const iso=(d:Date)=>d.toISOString().slice(0,10);

type Props={user:any;profile:any};
type Meal={id:string;meal_date:string;meal_type:string;name:string;description:string;allergens:string[]};

export default function ChefPage({user,profile}:Props){
 const [meals,setMeals]=useState<Meal[]>([]),[rsvps,setRsvps]=useState<any[]>([]),[allergyRows,setAllergyRows]=useState<any[]>([]),[late,setLate]=useState<any[]>([]),[tab,setTab]=useState("dashboard"),[saving,setSaving]=useState<string|null>(null),[error,setError]=useState("");
 const [announcementTitle,setAnnouncementTitle]=useState(""),[announcementMessage,setAnnouncementMessage]=useState(""),[announcementStatus,setAnnouncementStatus]=useState("");
 async function load(){
  const {data:menu}=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(menu){const {data,e}=await supabase.from("meals").select("id,meal_date,meal_type,name,description,allergens").eq("menu_id",menu.id).order("meal_date");if(e)setError(e.message);setMeals(data||[])}
  const [r,a,l]=await Promise.all([supabase.from("rsvps").select("meal_id,user_id,attending"),supabase.from("member_allergies").select("user_id,allergen"),supabase.from("late_plates").select("id,meal_id,user_id,status,created_at").neq("status","cancelled")]);
  setRsvps(r.data||[]);setAllergyRows(a.data||[]);setLate(l.data||[]);
 }
 useEffect(()=>{load()},[]);
 const conflicts=useMemo(()=>meals.map(m=>{const attending=new Set(rsvps.filter(r=>r.meal_id===m.id&&r.attending).map(r=>r.user_id));const matches=allergyRows.filter(a=>attending.has(a.user_id)&&m.allergens?.includes(a.allergen));return {...m,count:new Set(matches.map(x=>x.user_id)).size,allergens:[...new Set(matches.map(x=>x.allergen))]}}).filter(m=>m.count>0),[meals,rsvps,allergyRows]);
 const count=(id:string)=>rsvps.filter(r=>r.meal_id===id&&r.attending).length;
 async function updateMeal(id:string,field:string,value:any){setSaving(id);const {error:e}=await supabase.from("meals").update({[field]:value,updated_at:new Date().toISOString()}).eq("id",id);if(e)setError(e.message);else setMeals(x=>x.map(m=>m.id===id?{...m,[field]:value}:m));setSaving(null)}
 async function updateLate(id:string,status:string){const {error:e}=await supabase.from("late_plates").update({status}).eq("id",id);if(e)setError(e.message);else setLate(x=>x.map(l=>l.id===id?{...l,status}:l))}
 async function sendAnnouncement(){setAnnouncementStatus("");const title=announcementTitle.trim(),message=announcementMessage.trim();if(!title||!message){setAnnouncementStatus("Title and message are required.");return}const {data,error:e}=await supabase.rpc("send_member_announcement",{p_title:title,p_message:message,p_type:"announcement"});if(e){setAnnouncementStatus(e.message);return}setAnnouncementStatus(`${data||0} members notified.`);setAnnouncementTitle("");setAnnouncementMessage("")}
 async function signOut(){await supabase.auth.signOut()}
 return <section className="roleWorkspace chefWorkspace"><header className="roleHero"><span>{profile?.role?.toUpperCase()}</span><h1>Chef Dashboard</h1><p>Meals, headcounts, allergy alerts and late plates.</p><button onClick={signOut}>Sign out</button></header>
 <nav className="workspaceNav">{[["dashboard","🧑‍🍳 Dashboard"],["menu","🍽️ Menu"],["alerts","⚠️ Allergy Alerts"],["headcount","👥 Headcounts"],["late","🥡 Late Plates"],["announce","🔔 Notify Members"],["print","🖨️ Print"]].map(([k,l])=><button key={k} className={tab===k?"active":""} onClick={()=>setTab(k)}>{l}{k==="alerts"&&conflicts.length?` (${conflicts.length})`:""}</button>)}</nav>{error&&<div className="error">{error}</div>}
 {tab==="dashboard"&&<section className="panel"><h2>Kitchen Overview</h2><div className="stats"><div><b>{meals.length}</b><span>Meals</span></div><div><b>{rsvps.filter(r=>r.attending).length}</b><span>RSVPs</span></div><div><b>{conflicts.length}</b><span>Allergy conflicts</span></div><div><b>{late.filter(l=>l.status==="requested").length}</b><span>Late plates</span></div></div></section>}
 {tab==="menu"&&<section className="panel"><h2>Edit Meals</h2>{meals.map(m=><article className="mealCard" key={m.id}><div><small>{m.meal_date} · {m.meal_type}</small><input value={m.name} onChange={e=>updateMeal(m.id,"name",e.target.value)} /><textarea value={m.description||""} onChange={e=>updateMeal(m.id,"description",e.target.value)}/><div className="allergyGrid">{allergens.map(a=><label key={a}><input type="checkbox" checked={m.allergens?.includes(a)} onChange={()=>updateMeal(m.id,"allergens",m.allergens?.includes(a)?m.allergens.filter(x=>x!==a):[...(m.allergens||[]),a])}/>{a}</label>)}</div></div>{saving===m.id&&<small>Saving…</small>}</article>)}</section>}
 {tab==="alerts"&&<section className="panel"><h2>Allergy Alerts</h2>{conflicts.length?conflicts.map(c=><article className="error" key={c.id}><b>{c.meal_date} · {c.meal_type} — {c.name}</b><span>{c.count} attending member(s) match: {c.allergens.join(", ")}</span></article>):<div className="message">No current RSVP allergy conflicts.</div>}</section>}
 {tab==="headcount"&&<section className="panel"><h2>Meal Headcounts</h2>{meals.map(m=><div className="roleCard" key={m.id}><b>{m.meal_date} · {m.meal_type}</b><span>{m.name}</span><strong>{count(m.id)} attending</strong></div>)}</section>}
 {tab==="late"&&<section className="panel"><h2>Late Plates</h2>{late.length?late.map(l=><div className="roleCard" key={l.id}><b>{meals.find(m=>m.id===l.meal_id)?.name||"Meal"}</b><span>{l.status}</span>{l.status==="requested"&&<div><button onClick={()=>updateLate(l.id,"approved")}>Approve</button><button onClick={()=>updateLate(l.id,"ready")}>Ready</button></div>}</div>):<div className="message">No active late-plate requests.</div>}</section>}
 {tab==="announce"&&<section className="panel"><h2>Notify Members</h2><p>Send an announcement to all Members.</p><input value={announcementTitle} onChange={e=>setAnnouncementTitle(e.target.value)} placeholder="Announcement title" /><textarea value={announcementMessage} onChange={e=>setAnnouncementMessage(e.target.value)} placeholder="Message for Members" rows={5}/><button onClick={sendAnnouncement}>Send notification</button>{announcementStatus&&<div className="message">{announcementStatus}</div>}</section>}
 {tab==="print"&&<section className="panel printSheet"><h2>Kitchen Sheet</h2><p>{new Date().toLocaleDateString()}</p>{meals.filter(m=>m.meal_date===iso(new Date())).map(m=><article key={m.id}><h3>{m.meal_type}: {m.name}</h3><p>{count(m.id)} attending · {late.filter(l=>l.meal_id===m.id).length} late plates</p>{m.allergens?.length>0&&<p>Allergens: {m.allergens.join(", ")}</p>}</article>)}<button onClick={()=>window.print()}>Print Kitchen Sheet</button></section>}
 </section>
}
