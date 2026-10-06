import React,{useEffect,useMemo,useState}from"react";
import{Bell,Check,Clock3,CircleUserRound,Home as HomeIcon,LogOut,Save,ShieldAlert,X}from"lucide-react";
import{supabase}from"./lib/supabase";

type Props={user:any;profile:any};
type Meal={id:string;name:string;description?:string|null;meal_date:string;meal_type:string;allergens?:string[]|null};
type Notice={id:string;title:string;message:string;created_at:string;read:boolean};
type Late={id:string;meal_id:string;requested_at:string;status:string;notes?:string|null};
const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${y}-${m}-${day}`};
const today=()=>iso(new Date());
const fmt=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const order=["breakfast","lunch","dinner","snack"];
export default function MemberV2Clean({user,profile}:Props){
 const[name]=useState(profile?.full_name||user?.email?.split("@")[0]||"Member");
 const[tab,setTab]=useState("home"),[meals,setMeals]=useState<Meal[]>([]),[notices,setNotices]=useState<Notice[]>([]),[late,setLate]=useState<Late[]>([]),[allergies,setAllergies]=useState<string[]>([]),[diet,setDiet]=useState<string[]>([]),[notes,setNotes]=useState(""),[loading,setLoading]=useState(true),[toast,setToast]=useState("");
 const load=async()=>{setLoading(true);const start=new Date();start.setHours(12,0,0,0);const end=new Date(start);end.setDate(end.getDate()+13);const[a,b,c,d]=await Promise.all([supabase.from("meals").select("id,name,description,meal_date,meal_type,allergens").gte("meal_date",iso(start)).lte("meal_date",iso(end)).order("meal_date"),supabase.from("notifications").select("id,title,message,created_at,read").or(`user_id.eq.${user.id},user_id.is.null`).order("created_at",{ascending:false}).limit(50),supabase.from("late_plate_requests").select("id,meal_id,requested_at,status,notes").eq("member_id",user.id).order("requested_at",{ascending:false}).limit(20),supabase.from("allergy_profiles").select("allergies,dietary_restrictions,notes").eq("member_id",user.id).maybeSingle()]);setMeals(a.data||[]);setNotices(b.data||[]);setLate(c.data||[]);setAllergies(d.data?.allergies||[]);setDiet(d.data?.dietary_restrictions||[]);setNotes(d.data?.notes||"");setLoading(false)};
 useEffect(()=>{void load()},[user.id]);
 const unread=notices.filter(n=>!n.read).length;const todayMeals=meals.filter(m=>m.meal_date===today());
 const requestLate=async(m:Meal)=>{const existing=late.find(x=>x.meal_id===m.id&&(x.status==="requested"||x.status==="approved"));if(existing){setToast("You already requested a late plate for this meal.");return}const{error}=await supabase.from("late_plate_requests").insert({meal_id:m.id,member_id:user.id,notes:"Arriving after normal meal service",status:"requested"});setToast(error?.message||"Late plate request sent to the kitchen.");if(!error)void load()};
 const saveProfile=async()=>{const{error}=await supabase.from("allergy_profiles").upsert({member_id:user.id,allergies,dietary_restrictions:diet,notes,updated_at:new Date().toISOString()},{onConflict:"member_id"});setToast(error?.message||"Dining profile saved.")};
 const markRead=async(id:string)=>{await supabase.from("notifications").update({read:true}).eq("id",id);void load()};
 const markAll=async()=>{await supabase.from("notifications").update({read:true}).eq("user_id",user.id);void load()};
 const signOut=async()=>{await supabase.auth.signOut()};
 return <div className="member-v2-clean v3-member"><main>
 {tab==="home"&&<Home name={name} meals={meals} loading={loading} onLate={requestLate}/>} 
 {tab==="late"&&<LateView meals={meals}requests={late}onRequest={requestLate}/>} 
 {tab==="notifications"&&<Notices notices={notices}onRead={markRead}onAll={markAll}/>} 
 {tab==="profile"&&<Profile name={name}email={user.email}allergies={allergies}setAllergies={setAllergies}diet={diet}setDiet={setDiet}notes={notes}setNotes={setNotes}onSave={saveProfile}onSignOut={signOut}toast={toast}/>} 
 {toast&&tab!=="profile"&&<div className="toast">{toast}<button onClick={()=>setToast("")}><X size={15}/></button></div>}
 </main><nav>{[["home","Home",HomeIcon],["late","Late Plate",Clock3],["notifications","Alerts",Bell],["profile","Profile",CircleUserRound]].map(([id,label,Icon]:any)=><button key={id}className={tab===id?"active":""}onClick={()=>setTab(id)}><Icon size={19} strokeWidth={2.2}/><span>{label}</span>{id==="notifications"&&unread>0?<em>{unread}</em>:null}</button>)}</nav></div>
}
function BrandMark(){return <svg className="brand-mark" viewBox="0 0 36 36" aria-hidden="true"><path d="M10 5v9c0 3 2 5 5 5V31M7 5v8M10 5v8M13 5v8M20 5c3 4 3 9 0 13l-1 1v12M20 5h3v8c0 2-1 3-3 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
function Head({eyebrow,title,sub}:{eyebrow:string;title:string;sub?:string}){return <div className="head"><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>}
function Home({name,meals,loading,onLate}:{name:string;meals:Meal[];loading:boolean;onLate:(m:Meal)=>void}){
 const hour=new Date().getHours(),greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
 const firstName=String(name).trim().split(/\s+/)[0]||"Member";
 const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return d});
 const grouped=useMemo(()=>{const map=new Map<string,Meal[]>();meals.forEach(m=>map.set(m.meal_date,[...(map.get(m.meal_date)||[]),m]));return map},[meals]);
 const end=days[13];
 return <div className="home-shell">
   <section className="reference-header">
     <div className="reference-top">
       <div className="reference-brand"><BrandMark/><div><b>HOUSEEATS</b><small>TASTEFUL TRADITIONS</small></div></div>
       <div className="reference-motto"><span>GOOD FOOD</span><i/><span>STRONGER BONDS</span><i/></div>
     </div>
     <p className="reference-greeting">{greeting}, <em>{firstName}.</em></p>
     <div className="reference-menu-meta"><span>14-DAY MENU</span><b>{days[0].toLocaleDateString(undefined,{month:"long",day:"numeric"})} — {end.toLocaleDateString(undefined,{month:"long",day:"numeric"})}</b></div>
     <div className="reference-gold-rule"/>
   </section>
   <section className="rolling-menu">
     {days.map(d=>{
       const key=iso(d),list=(grouped.get(key)||[]).filter(m=>m.meal_type==="lunch"||m.meal_type==="dinner").sort((a,b)=>order.indexOf(a.meal_type)-order.indexOf(b.meal_type));
       const lunch=list.find(m=>m.meal_type==="lunch"),dinner=list.find(m=>m.meal_type==="dinner");
       return <section className={"menu-day-row "+(key===today()?"today":"")} key={key}>
         <div className="menu-day-label">{key===today()?<><b>TODAY</b><span>·</span></>:null}<strong>{d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}, {d.toLocaleDateString(undefined,{month:"short"})} {d.getDate()}</strong></div>
         <div className="menu-meals-stack"><MealLine meal={lunch} onLate={onLate}/><MealLine meal={dinner} onLate={onLate}/></div>
       </section>
     })}
     {loading&&<div className="menu-loading">Loading menu…</div>}
   </section>
 </div>
}

function MealLine({meal,onLate}:{meal?:Meal;onLate:(m:Meal)=>void}){if(!meal)return <div className="menu-meal-line empty-meal"><div className="menu-meal-copy"><span>MEAL</span><b>Menu not posted</b></div></div>;return <article className="menu-meal-line"><div className="menu-meal-copy"><span className={"meal-pill "+meal.meal_type}>{meal.meal_type.toUpperCase()}</span><b>{meal.name}</b>{meal.description&&<p>{meal.description}</p>}{meal.allergens?.length?<div className="meal-tags">{meal.allergens.slice(0,4).map(a=><small key={a}>{a}</small>)}</div>:null}</div><button className="late-meal-action"onClick={()=>onLate(meal)}><Clock3 size={17}/><span>Late Plate</span></button></article>}

function LateView({meals,requests,onRequest}:{meals:Meal[];requests:Late[];onRequest:(m:Meal)=>void}){const upcoming=meals.filter(m=>m.meal_date>=today()).slice(0,14);const active=new Map(requests.map(r=>[r.meal_id,r]));return <><Head eyebrow="DINING SUPPORT" title="Late plate" sub="Tell the kitchen which meal you need held for you."/><section className="late-panel"><div className="late-intro"><Clock3 size={24}/><div><b>Need extra time?</b><p>Request a late plate before service so the kitchen knows to hold yours.</p></div></div>{upcoming.length?upcoming.map(m=>{const r=active.get(m.id);return <button className="late-meal"key={m.id}onClick={()=>!r&&onRequest(m)}disabled={!!r}><span><b>{m.name}</b><small>{fmt(m.meal_date)} · {m.meal_type}</small></span><strong>{r?r.status==="picked_up"?"Picked up":r.status==="ready"?"Ready":"Requested":"Request"}</strong></button>}):<div className="empty">No upcoming meals have been posted.</div>}</section><p className="late-note">Once requested, the kitchen can move your plate through its normal preparation and ready process.</p></>}
function Notices({notices,onRead,onAll}:{notices:Notice[];onRead:(id:string)=>void;onAll:()=>void}){return <><Head eyebrow="INBOX" title="Updates" sub="Kitchen and chapter notices in one place."/><div className="notice-head"><span>{notices.filter(n=>!n.read).length} unread</span><button onClick={onAll}>Mark all read</button></div>{notices.length?notices.map(n=><button className={"notice "+(n.read?"read":"")}key={n.id}onClick={()=>onRead(n.id)}><span className="dot"/><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleDateString()}</small></div></button>):<div className="empty"><Bell/><b>You're all caught up.</b></div>}</>}
function Profile({name,email,allergies,setAllergies,diet,setDiet,notes,setNotes,onSave,onSignOut,toast}:{name:string;email:string;allergies:string[];setAllergies:(x:string[])=>void;diet:string[];setDiet:(x:string[])=>void;notes:string;setNotes:(x:string)=>void;onSave:()=>void;onSignOut:()=>void;toast:string}){const opts=["Peanuts","Tree nuts","Milk","Eggs","Wheat","Soy","Fish","Shellfish","Sesame"];return <><Head eyebrow="ACCOUNT" title={name} sub={email}/><section className="profile"><div className="private"><ShieldAlert size={17}/><span>Allergy information is shared with authorized kitchen staff only.</span></div><h3>Allergies</h3><div className="chips">{opts.map(x=><button key={x}className={allergies.includes(x)?"selected":""}onClick={()=>setAllergies(allergies.includes(x)?allergies.filter(a=>a!==x):[...allergies,x])}>{allergies.includes(x)&&<Check size={13}/>} {x}</button>)}</div><label>Dietary restrictions<input value={diet.join(", ")}onChange={e=>setDiet(e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label><label>Kitchen notes<textarea value={notes}onChange={e=>setNotes(e.target.value)}placeholder="Anything the kitchen should know?"/></label><button className="save"onClick={onSave}><Save size={17}/>Save dining profile</button>{toast&&<p className="saved">{toast}</p>}</section><button className="signout"onClick={onSignOut}><LogOut size={17}/>Sign out</button></>}
