import React,{useEffect,useMemo,useState}from"react";
import{Bell,Check,Clock3,CircleUserRound,House,LogOut,Save,ShieldAlert,Utensils,X}from"lucide-react";
import{supabase}from"./lib/supabase";
import"./member-v3.css";

type Props={user:any;profile:any};
type Meal={id:string;name:string;description?:string|null;meal_date:string;meal_type:string;allergens?:string[]|null};
type Notice={id:string;title:string;message:string;created_at:string;read:boolean};
type Late={id:string;meal_id:string;requested_at:string;status:string;notes?:string|null};

const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return`${y}-${m}-${day}`};
const today=()=>iso(new Date());
const fmt=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});\nconst dayLabel=(s:string)=>fmt(s).replace(/^\\w+/,x=>x.toUpperCase());

export default function MemberV3({user,profile}:Props){
 const[name]=useState(profile?.full_name||user?.email?.split("@")[0]||"Member");
 const[tab,setTab]=useState<"home"|"late"|"notifications"|"profile">("home");
 const[meals,setMeals]=useState<Meal[]>([]),[notices,setNotices]=useState<Notice[]>([]),[late,setLate]=useState<Late[]>([]);
 const[allergies,setAllergies]=useState<string[]>([]),[diet,setDiet]=useState<string[]>([]),[notes,setNotes]=useState("");
 const[loading,setLoading]=useState(true),[toast,setToast]=useState("");

 const load=async()=>{
   setLoading(true);
   const start=new Date();start.setHours(12,0,0,0);
   const end=new Date(start);end.setDate(end.getDate()+13);
   const[a,b,c,d]=await Promise.all([
     supabase.from("meals").select("id,name,description,meal_date,meal_type,allergens").gte("meal_date",iso(start)).lte("meal_date",iso(end)).order("meal_date"),
     supabase.from("notifications").select("id,title,message,created_at,read").or(`user_id.eq.${user.id},user_id.is.null`).order("created_at",{ascending:false}).limit(50),
     supabase.from("late_plate_requests").select("id,meal_id,requested_at,status,notes").eq("member_id",user.id).order("requested_at",{ascending:false}).limit(20),
     supabase.from("allergy_profiles").select("allergies,dietary_restrictions,notes").eq("member_id",user.id).maybeSingle()
   ]);
   setMeals(a.data||[]);setNotices(b.data||[]);setLate(c.data||[]);
   setAllergies(d.data?.allergies||[]);setDiet(d.data?.dietary_restrictions||[]);setNotes(d.data?.notes||"");
   setLoading(false);
 };
 useEffect(()=>{void load()},[user.id]);

 const unread=notices.filter(n=>!n.read).length;
 const requestLate=async(m:Meal)=>{
   const existing=late.find(x=>x.meal_id===m.id&&(x.status==="requested"||x.status==="approved"));
   if(existing){setToast("You already requested a late plate for this meal.");return}
   const{error}=await supabase.from("late_plate_requests").insert({meal_id:m.id,member_id:user.id,notes:"Arriving after normal meal service",status:"requested"});
   setToast(error?.message||"Late plate request sent to the kitchen.");
   if(!error)void load();
 };
 const saveProfile=async()=>{
   const{error}=await supabase.from("allergy_profiles").upsert({member_id:user.id,allergies,dietary_restrictions:diet,notes,updated_at:new Date().toISOString()},{onConflict:"member_id"});
   setToast(error?.message||"Dining profile saved.");
 };
 const markRead=async(id:string)=>{await supabase.from("notifications").update({read:true}).eq("id",id);void load()};
 const markAll=async()=>{await supabase.from("notifications").update({read:true}).eq("user_id",user.id);void load()};
 const signOut=async()=>{await supabase.auth.signOut()};

 return <div className="he-v3">
   {tab==="home"&&<Home name={name} meals={meals} loading={loading} onLate={requestLate}/>}
   {tab==="late"&&<LateView meals={meals} requests={late} onRequest={requestLate}/>}
   {tab==="notifications"&&<Notices notices={notices} onRead={markRead} onAll={markAll}/>}
   {tab==="profile"&&<Profile name={name} email={user.email} allergies={allergies} setAllergies={setAllergies} diet={diet} setDiet={setDiet} notes={notes} setNotes={setNotes} onSave={saveProfile} onSignOut={signOut} toast={toast}/>}
   {toast&&tab!=="profile"&&<div className="he-toast">{toast}<button onClick={()=>setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
   <nav className="he-nav" aria-label="Member navigation">
     <NavButton id="home" label="Home" icon={House} active={tab==="home"} onClick={()=>setTab("home")}/>
     <NavButton id="late" label="Late Plate" icon={Clock3} active={tab==="late"} onClick={()=>setTab("late")}/>
     <NavButton id="notifications" label="Alerts" icon={Bell} active={tab==="notifications"} onClick={()=>setTab("notifications")} badge={unread}/>
     <NavButton id="profile" label="Profile" icon={CircleUserRound} active={tab==="profile"} onClick={()=>setTab("profile")}/>
   </nav>
 </div>
}

function NavButton({id,label,icon:Icon,active,onClick,badge}:{id:string;label:string;icon:any;active:boolean;onClick:()=>void;badge?:number}){
 return <button className={active?"active":""} onClick={onClick} aria-current={active?"page":undefined} aria-label={label}><Icon/><span>{label}</span>{badge? <em>{badge>9?"9+":badge}</em>:null}</button>
}

function Brand(){
 return <div className="he-brand">
   <Utensils className="he-brand-icon"/>
   <div><strong>HOUSEEATS</strong><small>TASTEFUL TRADITIONS</small></div>
   <div className="he-motto"><span>GOOD FOOD</span><b>—</b><span>STRONGER BONDS</span><b>—</b></div>
 </div>
}

function Home({name,meals,loading,onLate}:{name:string;meals:Meal[];loading:boolean;onLate:(m:Meal)=>void}){
 const hour=new Date().getHours(),greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
 const firstName=String(name).trim().split(/\s+/)[0]||"Member";
 const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return d});
 const end=days[13];
 const grouped=useMemo(()=>{const map=new Map<string,Meal[]>();for(const meal of meals){map.set(meal.meal_date,[...(map.get(meal.meal_date)||[]),meal])}return map},[meals]);
 return <main className="he-home">
   <header className="he-hero">
     <Brand/>
     <div className="he-greeting">{greeting}, <i>{firstName}.</i></div>
   </header>
   <section className="he-menu-heading">
     <div className="eyebrow">14-DAY MENU</div>
     <div className="range">{days[0].toLocaleDateString(undefined,{month:"long",day:"numeric"})} — {end.toLocaleDateString(undefined,{month:"long",day:"numeric"})}</div>
   </section>
   <section className="he-menu">
     {days.map((d,i)=>{
       const key=iso(d),items=(grouped.get(key)||[]).filter(m=>m.meal_type==="lunch"||m.meal_type==="dinner");
       const lunch=items.find(m=>m.meal_type==="lunch"),dinner=items.find(m=>m.meal_type==="dinner");
       return <section className={i===0?"he-day today":"he-day"} key={key}>
         <div className="he-day-title">{i===0&&<><b>TODAY</b><span className="dot-sep">·</span></>}<span>{dayLabel(key)}</span></div>
         <MealRow meal={lunch} type="lunch" onLate={onLate}/>
         <MealRow meal={dinner} type="dinner" onLate={onLate}/>
       </section>
     })}
     {loading&&<div className="he-loading">Loading menu…</div>}
   </section>
 </main>
}

function MealRow({meal,type,onLate}:{meal?:Meal;type:"lunch"|"dinner";onLate:(m:Meal)=>void}){
 return <article className="he-meal">
   <div className={type==="lunch"?"he-type lunch":"he-type dinner"}>{type.toUpperCase()}</div>
   <div className="he-meal-copy">
     <h3>{meal?.name||"Menu not posted"}</h3>
     {meal?.description&&<p>{meal.description}</p>}
     {meal?.allergens?.length?<div className="he-allergens">{meal.allergens.map(a=><span key={a}>{a}</span>)}</div>:null}
   </div>
   {meal&&<button className="he-late" onClick={()=>onLate(meal)}><Clock3/><span>Late Plate</span></button>}
 </article>
}

function PageHead({eyebrow,title,sub}:{eyebrow:string;title:string;sub?:string}){
 return <header className="he-page-head"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{sub&&<p>{sub}</p>}</header>
}
function LateView({meals,requests,onRequest}:{meals:Meal[];requests:Late[];onRequest:(m:Meal)=>void}){
 const upcoming=meals.filter(m=>m.meal_date>=today()).slice(0,20),active=new Map(requests.map(r=>[r.meal_id,r]));
 return <main className="he-page"><PageHead eyebrow="DINING SUPPORT" title="Late plate" sub="Tell the kitchen which meal you need held for you."/><section className="he-panel"><div className="he-panel-intro"><Clock3/><div><strong>Need extra time?</strong><p>Request a late plate before service so the kitchen knows to hold yours.</p></div></div>{upcoming.length?upcoming.map(m=>{const r=active.get(m.id);return <button className="he-request" key={m.id} onClick={()=>!r&&onRequest(m)} disabled={!!r}><span><b>{m.name}</b><small>{fmt(m.meal_date)} · {m.meal_type}</small></span><strong>{r?r.status==="picked_up"?"Picked up":r.status==="ready"?"Ready":"Requested":"Request"}</strong></button>}):<div className="he-empty">No upcoming meals have been posted.</div>}</section></main>
}
function Notices({notices,onRead,onAll}:{notices:Notice[];onRead:(id:string)=>void;onAll:()=>void}){
 return <main className="he-page"><PageHead eyebrow="INBOX" title="Updates" sub="Kitchen and chapter notices in one place."/><div className="he-notice-head"><span>{notices.filter(n=>!n.read).length} unread</span><button onClick={onAll}>Mark all read</button></div>{notices.length?notices.map(n=><button className={n.read?"he-notice read":"he-notice"} key={n.id} onClick={()=>onRead(n.id)}><span className="dot"/><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleDateString()}</small></div></button>):<div className="he-empty"><Bell/><b>You're all caught up.</b></div>}</main>
}
function Profile({name,email,allergies,setAllergies,diet,setDiet,notes,setNotes,onSave,onSignOut,toast}:{name:string;email?:string;allergies:string[];setAllergies:(x:string[])=>void;diet:string[];setDiet:(x:string[])=>void;notes:string;setNotes:(x:string)=>void;onSave:()=>void;onSignOut:()=>void;toast:string}){
 const opts=["Peanuts","Tree nuts","Milk","Eggs","Wheat","Soy","Fish","Shellfish","Sesame"];
 return <main className="he-page"><PageHead eyebrow="ACCOUNT" title={name} sub={email}/><section className="he-profile"><div className="he-private"><ShieldAlert/><span>Allergy information is shared with authorized kitchen staff only.</span></div><h2>Allergies</h2><div className="he-chips">{opts.map(x=><button key={x} className={allergies.includes(x)?"selected":""} onClick={()=>setAllergies(allergies.includes(x)?allergies.filter(a=>a!==x):[...allergies,x])}>{allergies.includes(x)&&<Check/>}{x}</button>)}</div><label>Dietary restrictions<input value={diet.join(", ")} onChange={e=>setDiet(e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label><label>Kitchen notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anything the kitchen should know?"/></label><button className="he-save" onClick={onSave}><Save/>Save dining profile</button>{toast&&<p className="he-saved">{toast}</p>}</section><button className="he-signout" onClick={onSignOut}><LogOut/>Sign out</button></main>
}
