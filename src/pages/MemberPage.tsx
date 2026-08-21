import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import NotificationCenter, { HouseNotification } from "../components/NotificationCenter";

const allergens = ["Milk","Eggs","Wheat","Soy","Peanuts","Tree Nuts","Fish","Shellfish","Sesame"];
const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const mondayOf = (d: Date) => { const x = new Date(d); const n = x.getDay(); x.setDate(x.getDate() + (n === 0 ? -6 : 1 - n)); x.setHours(0,0,0,0); return x; };
const iso = (d: Date) => d.toISOString().slice(0,10);

type Props = { user:any; profile:any };
type Meal = { id:string; meal_date:string; meal_type:string; name:string; description:string; allergens:string[] };
type Tab = "home"|"menu"|"allergies"|"late"|"notifications"|"profile";

export default function MemberPage({user,profile}:Props){
 const [tab,setTab]=useState<Tab>("home"),[meals,setMeals]=useState<Meal[]>([]),[myAllergies,setMyAllergies]=useState<string[]>([]),[rsvps,setRsvps]=useState<Record<string,boolean>>({}),[late,setLate]=useState<string[]>([]),[notifications,setNotifications]=useState<HouseNotification[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const start=useMemo(()=>mondayOf(new Date()),[]),end=useMemo(()=>{const d=new Date(start);d.setDate(d.getDate()+27);return d},[start]);
 async function load(){
  setLoading(true);setError("");
  const {data:menu}=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(menu){const {data}=await supabase.from("meals").select("id,meal_date,meal_type,name,description,allergens").eq("menu_id",menu.id).gte("meal_date",iso(start)).lte("meal_date",iso(end)).order("meal_date");setMeals(data||[])}
  const [a,r,l,n]=await Promise.all([
   supabase.from("member_allergies").select("allergen").eq("user_id",user.id),
   supabase.from("rsvps").select("meal_id,attending").eq("user_id",user.id),
   supabase.from("late_plates").select("meal_id").eq("user_id",user.id).neq("status","cancelled"),
   supabase.from("notifications").select("id,type,title,message,read,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)
  ]);
  setMyAllergies((a.data||[]).map((x:any)=>x.allergen));setRsvps(Object.fromEntries((r.data||[]).map((x:any)=>[x.meal_id,x.attending])));setLate((l.data||[]).map((x:any)=>x.meal_id));setNotifications((n.data||[]) as HouseNotification[]);
  const firstError=[a.error,r.error,l.error,n.error].find(Boolean);if(firstError)setError(firstError.message);setLoading(false);
 }
 useEffect(()=>{load();const channel=supabase.channel(`member-notifications-${user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"notifications",filter:`user_id=eq.${user.id}`},()=>load()).subscribe();return()=>{supabase.removeChannel(channel)}},[user.id]);
 async function toggleRsvp(meal_id:string){const attending=!rsvps[meal_id];const {error:e}=await supabase.from("rsvps").upsert({user_id:user.id,meal_id,attending,updated_at:new Date().toISOString()},{onConflict:"user_id,meal_id"});if(!e)setRsvps(x=>({...x,[meal_id]:attending}));else setError(e.message)}
 async function toggleAllergy(a:string){if(myAllergies.includes(a)){const {error:e}=await supabase.from("member_allergies").delete().eq("user_id",user.id).eq("allergen",a);if(!e)setMyAllergies(x=>x.filter(v=>v!==a));}else{const {error:e}=await supabase.from("member_allergies").insert({user_id:user.id,allergen:a});if(!e)setMyAllergies(x=>[...x,a]);}}
 async function requestLate(meal_id:string){if(late.includes(meal_id))return;const {error:e}=await supabase.from("late_plates").insert({user_id:user.id,meal_id,status:"requested"});if(!e)setLate(x=>[...x,meal_id]);else setError(e.message)}
 async function read(id:string){const {error:e}=await supabase.from("notifications").update({read:true}).eq("id",id).eq("user_id",user.id);if(!e)setNotifications(x=>x.map(n=>n.id===id?{...n,read:true}:n))}
 async function readAll(){const {error:e}=await supabase.from("notifications").update({read:true}).eq("user_id",user.id).eq("read",false);if(!e)setNotifications(x=>x.map(n=>({...n,read:true})))}
 async function signOut(){await supabase.auth.signOut()}
 const unread=notifications.filter(n=>!n.read).length;
 const today=iso(new Date());const todays=meals.filter(m=>m.meal_date===today);
 const renderMeal=(m:Meal)=><article className="mealCard" key={m.id}><div><small>{m.meal_type}</small><h3>{m.name}</h3><p>{m.description}</p>{m.allergens?.length>0&&<small>⚠️ {m.allergens.join(", ")}</small>}</div><div className="mealActions"><button onClick={()=>toggleRsvp(m.id)}>{rsvps[m.id]?"✓ Coming":"RSVP"}</button><button onClick={()=>requestLate(m.id)} disabled={late.includes(m.id)}>{late.includes(m.id)?"Late requested":"Late Plate"}</button></div></article>;
 return <section className="roleWorkspace memberWorkspace">
  <header className="roleHero"><span>MEMBER</span><h1>Welcome, {profile?.full_name||"Member"}</h1><p>Your meals, allergies, late plates and notifications.</p><button onClick={signOut}>Sign out</button></header>
  <nav className="workspaceNav">{(["home","menu","allergies","late","notifications","profile"] as Tab[]).map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x==="home"?"🏠 Home":x==="menu"?"🍽️ Menu":x==="allergies"?"⚠️ Allergies":x==="late"?"🥡 Late Plate":x==="notifications"?`🔔 Notifications${unread?` (${unread})`:""}`:"👤 Profile"}</button>)}</nav>
  {error&&<div className="error">{error}</div>}
  {loading?<div className="message">Loading HouseEats…</div>:<>
   {tab==="home"&&<section className="panel"><h2>Today's Meals</h2>{todays.length?todays.map(renderMeal):<div className="message">No meals posted for today.</div>}<h2>Next Meals</h2>{meals.filter(m=>m.meal_date>=today).slice(0,4).map(renderMeal)}</section>}
   {tab==="menu"&&<section className="panel"><h2>4-Week Menu</h2><div className="menuList">{[0,1,2,3].map(w=><div className="calendarWeek" key={w}><h3>Week {w+1}</h3>{days.map(day=>{const dayMeals=meals.filter(m=>{const d=new Date(m.meal_date+"T00:00:00");return d>=new Date(start.getTime()+w*7*86400000)&&d<new Date(start.getTime()+(w+1)*7*86400000)&&d.toLocaleDateString(undefined,{weekday:"long"})===day});return <div key={day}><b>{day}</b>{dayMeals.map(renderMeal)}</div>})}</div>)}</div></section>}
   {tab==="allergies"&&<section className="panel"><h2>Allergies</h2><p>Select everything you need the kitchen to know about.</p><div className="allergyGrid">{allergens.map(a=><label key={a}><input type="checkbox" checked={myAllergies.includes(a)} onChange={()=>toggleAllergy(a)}/>{a}</label>)}</div><p><b>Selected:</b> {myAllergies.join(", ")||"None"}</p></section>}
   {tab==="late"&&<section className="panel"><h2>Late Plate</h2>{late.length?<div className="roleCards">{late.map(id=>{const m=meals.find(x=>x.id===id);return <div className="roleCard" key={id}><b>{m?.name||"Meal"}</b><small>{m?.meal_date} · {m?.meal_type}</small><span>Requested</span></div>})}</div>:<div className="message">You have no active late-plate requests. Request one from the menu.</div>}</section>}
   {tab==="notifications"&&<NotificationCenter notifications={notifications} onRead={read} onReadAll={readAll}/>} 
   {tab==="profile"&&<section className="panel"><h2>Profile</h2><p><b>Name:</b> {profile?.full_name||"—"}</p><p><b>Email:</b> {profile?.email||user.email}</p><p><b>Role:</b> Member</p></section>}
  </>}
 </section>
}
