import React,{useEffect,useMemo,useState}from"react";
import{Bell,CalendarDays,Check,ChevronRight,Clock3,CircleUserRound,House,LogOut,Save,ShieldAlert,UtensilsCrossed,X}from"lucide-react";
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
 return <div className="member-v2-clean"><style>{css}</style><main>
 {tab==="home"&&<Home name={name} meals={meals} loading={loading} onLate={requestLate}/>} 
 {tab==="late"&&<LateView meals={meals}requests={late}onRequest={requestLate}/>} 
 {tab==="notifications"&&<Notices notices={notices}onRead={markRead}onAll={markAll}/>} 
 {tab==="profile"&&<Profile name={name}email={user.email}allergies={allergies}setAllergies={setAllergies}diet={diet}setDiet={setDiet}notes={notes}setNotes={setNotes}onSave={saveProfile}onSignOut={signOut}toast={toast}/>} 
 {toast&&tab!=="profile"&&<div className="toast">{toast}<button onClick={()=>setToast("")}><X size={15}/></button></div>}
 </main><nav>{[["home","Home",House],["late","Late Plate",Clock3],["notifications","Alerts",Bell],["profile","Profile",CircleUserRound]].map(([id,label,Icon]:any)=><button key={id}className={tab===id?"active":""}onClick={()=>setTab(id)}><Icon size={19} strokeWidth={2.2}/><span>{label}</span>{id==="notifications"&&unread>0?<em>{unread}</em>:null}</button>)}</nav></div>
}
function Head({eyebrow,title,sub}:{eyebrow:string;title:string;sub?:string}){return <div className="head"><span>{eyebrow}</span><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>}
function Home({name,meals,loading,onLate}:{name:string;meals:Meal[];loading:boolean;onLate:(m:Meal)=>void}){
 const hour=new Date().getHours(),greeting=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
 const firstName=String(name).trim().split(/\s+/)[0]||"Member";
 const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);return d});
 const grouped=useMemo(()=>{const map=new Map<string,Meal[]>();meals.forEach(m=>map.set(m.meal_date,[...(map.get(m.meal_date)||[]),m]));return map},[meals]);
 const end=days[13];
 return <div className="home-shell">
   <section className="welcome-hero">
     <div className="welcome-brand"><UtensilsCrossed size={19}/><span>HOUSEEATS</span></div>
     <div className="welcome-copy">
       <p className="welcome-greeting">{greeting}, <i>{firstName}.</i></p>
       <p className="welcome-sub">Good food. Stronger bonds.</p>
     </div>
     <div className="welcome-rule"/>
   </section>
   <section className="menu-heading"><span>14-DAY MENU</span><p>{days[0].toLocaleDateString(undefined,{month:"long",day:"numeric"})} — {end.toLocaleDateString(undefined,{month:"long",day:"numeric"})}</p><div className="heading-rule"/></section><section className="rolling-menu">
     {days.map(d=>{
       const key=iso(d),list=(grouped.get(key)||[]).filter(m=>m.meal_type==="lunch"||m.meal_type==="dinner").sort((a,b)=>order.indexOf(a.meal_type)-order.indexOf(b.meal_type));
       const lunch=list.find(m=>m.meal_type==="lunch"),dinner=list.find(m=>m.meal_type==="dinner");
       return <section className={"menu-day-row "+(key===today()?"today":"")} key={key}>
  <div className="menu-day-label"><span>{key===today()?"TODAY":"".toUpperCase()}</span><em>{d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</em></div>
  <div className="menu-meals-stack"><MealLine meal={lunch} onLate={onLate}/><MealLine meal={dinner} onLate={onLate}/></div>
</section>
     {loading&&<div className="menu-loading">Loading menu…</div>}
   </section>
 </div>
}

function MealLine({meal,onLate}:{meal?:Meal;onLate:(m:Meal)=>void}){
 if(!meal)return <article className="menu-meal-line empty-meal"><span className="meal-type-pill lunch-pill">MEAL</span><div className="menu-meal-copy"><b>Menu not posted</b></div></article>;
 const dinner=meal.meal_type==="dinner";
 return <article className="menu-meal-line">
   <span className={"meal-type-pill "+(dinner?"dinner-pill":"lunch-pill")}>{meal.meal_type.toUpperCase()}</span>
   <div className="menu-meal-copy"><b>{meal.name}</b>{meal.description&&<p>{meal.description}</p>}{meal.allergens?.length?<div className="meal-allergens">{meal.allergens.map(a=><small className="meal-allergen" key={a}>{a}</small>)}</div>:null}</div>
   <button className="late-meal-action" onClick={()=>onLate(meal)}><Clock3 size={17}/> <span>Late Plate</span></button>
 </article>
}
function LateView({meals,requests,onRequest}:{meals:Meal[];requests:Late[];onRequest:(m:Meal)=>void}){const upcoming=meals.filter(m=>m.meal_date>=today()).slice(0,14);const active=new Map(requests.map(r=>[r.meal_id,r]));return <><Head eyebrow="DINING SUPPORT" title="Late plate" sub="Tell the kitchen which meal you need held for you."/><section className="late-panel"><div className="late-intro"><Clock3 size={24}/><div><b>Need extra time?</b><p>Request a late plate before service so the kitchen knows to hold yours.</p></div></div>{upcoming.length?upcoming.map(m=>{const r=active.get(m.id);return <button className="late-meal"key={m.id}onClick={()=>!r&&onRequest(m)}disabled={!!r}><span><b>{m.name}</b><small>{fmt(m.meal_date)} · {m.meal_type}</small></span><strong>{r?r.status==="picked_up"?"Picked up":r.status==="ready"?"Ready":"Requested":"Request"}</strong></button>}):<div className="empty">No upcoming meals have been posted.</div>}</section><p className="late-note">Once requested, the kitchen can move your plate through its normal preparation and ready process.</p></>}
function Notices({notices,onRead,onAll}:{notices:Notice[];onRead:(id:string)=>void;onAll:()=>void}){return <><Head eyebrow="INBOX" title="Updates" sub="Kitchen and chapter notices in one place."/><div className="notice-head"><span>{notices.filter(n=>!n.read).length} unread</span><button onClick={onAll}>Mark all read</button></div>{notices.length?notices.map(n=><button className={"notice "+(n.read?"read":"")}key={n.id}onClick={()=>onRead(n.id)}><span className="dot"/><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleDateString()}</small></div></button>):<div className="empty"><Bell/><b>You're all caught up.</b></div>}</>}
function Profile({name,email,allergies,setAllergies,diet,setDiet,notes,setNotes,onSave,onSignOut,toast}:{name:string;email:string;allergies:string[];setAllergies:(x:string[])=>void;diet:string[];setDiet:(x:string[])=>void;notes:string;setNotes:(x:string)=>void;onSave:()=>void;onSignOut:()=>void;toast:string}){const opts=["Peanuts","Tree nuts","Milk","Eggs","Wheat","Soy","Fish","Shellfish","Sesame"];return <><Head eyebrow="ACCOUNT" title={name} sub={email}/><section className="profile"><div className="private"><ShieldAlert size={17}/><span>Allergy information is shared with authorized kitchen staff only.</span></div><h3>Allergies</h3><div className="chips">{opts.map(x=><button key={x}className={allergies.includes(x)?"selected":""}onClick={()=>setAllergies(allergies.includes(x)?allergies.filter(a=>a!==x):[...allergies,x])}>{allergies.includes(x)&&<Check size={13}/>} {x}</button>)}</div><label>Dietary restrictions<input value={diet.join(", ")}onChange={e=>setDiet(e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/></label><label>Kitchen notes<textarea value={notes}onChange={e=>setNotes(e.target.value)}placeholder="Anything the kitchen should know?"/></label><button className="save"onClick={onSave}><Save size={17}/>Save dining profile</button>{toast&&<p className="saved">{toast}</p>}</section><button className="signout"onClick={onSignOut}><LogOut size={17}/>Sign out</button></>}
const css=`*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;background:#0b2f52}
body{font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#173a5d}
button{font:inherit}
.member-v2-clean{min-height:100vh;background:#f7f5ef;color:#173a5d}
.member-v2-clean main{padding:0 0 76px}
.member-v2-clean .home-shell{width:100%;max-width:760px;margin:0 auto;background:#f7f5ef;min-height:100vh}
.member-v2-clean .welcome-hero{background:#0b2f52;color:#fff;border-radius:0;padding:28px 50px 14px;margin:0;min-height:286px;position:relative;overflow:hidden}
.member-v2-clean .welcome-brand{display:flex;align-items:flex-start;gap:14px;color:#e0b653}
.member-v2-clean .welcome-brand svg{width:28px;height:44px;stroke-width:1.8;margin-top:1px}
.member-v2-clean .welcome-brand span{display:block;color:#fff;font-family:Georgia,"Times New Roman",serif;font-size:30px;line-height:1;letter-spacing:.045em;font-weight:500}
.member-v2-clean .welcome-brand:after{content:"TASTEFUL TRADITIONS";display:block;position:absolute;left:111px;top:73px;color:#e0b653;font-family:Georgia,"Times New Roman",serif;font-size:13px;letter-spacing:.12em}
.member-v2-clean .welcome-brand:before{content:"GOOD FOOD     —";white-space:pre;position:absolute;right:51px;top:82px;color:#e0b653;font-size:11px;letter-spacing:.06em}
.member-v2-clean .welcome-copy{margin-top:64px}
.member-v2-clean .welcome-greeting{margin:0;color:#f8f5ee;font-family:Georgia,"Times New Roman",serif;font-size:29px;line-height:1.1;font-weight:400}
.member-v2-clean .welcome-greeting i{color:#e2b656;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:600}
.member-v2-clean .welcome-sub{position:absolute;right:51px;top:103px;margin:0;color:#e0b653;font-family:Georgia,"Times New Roman",serif;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.member-v2-clean .welcome-rule{position:absolute;left:50px;right:50px;bottom:14px;height:2px;background:#e0b653}
.member-v2-clean .menu-heading{background:#f7f5ef;padding:20px 50px 12px;margin:0}
.member-v2-clean .menu-heading span{display:block;color:#c69a3d;font-size:14px;line-height:1.2;letter-spacing:.18em;font-weight:800}
.member-v2-clean .menu-heading p{margin:7px 0 14px;color:#173a5d;font-size:17px}
.member-v2-clean .heading-rule{height:1px;background:#d8aa4a}
.member-v2-clean .rolling-menu{margin:0;background:#f7f5ef;border:0;border-radius:0;box-shadow:none;overflow:visible}
.member-v2-clean .menu-day-row{display:block;margin:0 30px;border-bottom:1px solid #dfe2e3;padding:0;min-height:0;background:transparent;position:relative}
.member-v2-clean .menu-day-row.today{background:transparent;box-shadow:none;border-left:3px solid #d8aa4a}
.member-v2-clean .menu-day-label{height:auto;min-height:0;padding:18px 20px 11px;border:0;display:flex;align-items:baseline;gap:10px;text-align:left}
.member-v2-clean .menu-day-label span{font-size:22px;font-weight:800;letter-spacing:.02em;color:#173a5d}
.member-v2-clean .menu-day-row.today .menu-day-label span{color:#c69a3d}
.member-v2-clean .menu-day-label em{font-style:normal;background:none;color:#173a5d;border-radius:0;padding:0;margin:0;font-size:17px;font-weight:500;letter-spacing:0}
.member-v2-clean .menu-day-label span:empty{display:none}
.member-v2-clean .menu-meals-stack{padding:0 20px 0 20px}
.member-v2-clean .menu-meal-line{display:grid;grid-template-columns:92px minmax(0,1fr) 158px;align-items:start;gap:17px;min-height:124px;padding:17px 0;border-bottom:1px solid #dfe2e3}
.member-v2-clean .menu-meal-line:last-child{border-bottom:0}
.member-v2-clean .meal-type-pill{display:inline-flex;align-items:center;justify-content:center;justify-self:start;min-width:76px;height:27px;padding:0 13px;border-radius:18px;font-size:12px;font-weight:700;letter-spacing:.02em}
.member-v2-clean .lunch-pill{background:#dfc273;color:#173a5d}
.member-v2-clean .dinner-pill{background:#0b3a63;color:#fff}
.member-v2-clean .menu-meal-copy{min-width:0}
.member-v2-clean .menu-meal-copy>b{display:block;color:#173a5d;font-family:Inter,system-ui,sans-serif;font-size:17px;line-height:1.25;font-weight:800;margin:0 0 5px}
.member-v2-clean .menu-meal-copy p{margin:0;color:#173a5d;font-size:14px;line-height:1.45;max-width:390px}
.member-v2-clean .meal-allergens{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
.member-v2-clean .meal-allergen{display:inline-flex;align-items:center;padding:4px 10px;border-radius:13px;background:#e4e8e9;color:#33536f;font-size:10px;font-weight:700;letter-spacing:.03em}
.member-v2-clean .late-meal-action{justify-self:end;display:inline-flex;align-items:center;justify-content:center;gap:9px;min-width:145px;height:44px;padding:0 14px;border:2px solid #d3a846;background:transparent;color:#173a5d;border-radius:24px;font-size:13px;font-weight:800;white-space:nowrap}
.member-v2-clean .late-meal-action svg{stroke:#173a5d}
.member-v2-clean .empty-meal .menu-meal-copy>b{color:#8b969d;font-size:13px;font-weight:600}
.member-v2-clean .empty-meal{min-height:80px;align-items:center}
.member-v2-clean nav{position:fixed;z-index:20;left:0;right:0;bottom:0;height:76px;background:#0b2f52;border:0;box-shadow:none;display:grid;grid-template-columns:repeat(4,1fr);padding:8px 18px 10px}
.member-v2-clean nav button{position:relative;border:0;background:transparent;color:#d5dce3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:600}
.member-v2-clean nav button svg{width:28px;height:28px;stroke-width:1.8}
.member-v2-clean nav button.active{color:#e2b656}
.member-v2-clean nav button.active svg{stroke:#e2b656}
.member-v2-clean nav button em{position:absolute;top:2px;right:calc(50% - 31px);min-width:22px;height:22px;padding:0 5px;border-radius:50%;background:#e2b656;color:#173a5d;font-size:11px;font-style:normal;font-weight:800;display:flex;align-items:center;justify-content:center;border:0}
.member-v2-clean .toast{position:fixed;z-index:30;left:50%;bottom:88px;transform:translateX(-50%);background:#0b2f52;color:#fff;padding:10px 14px;border-radius:8px;font-size:12px}
@media(max-width:600px){
 .member-v2-clean .welcome-hero{padding:28px 50px 14px;min-height:286px}
 .member-v2-clean .welcome-brand span{font-size:29px}
 .member-v2-clean .welcome-brand:after{left:111px;top:73px;font-size:12px}
 .member-v2-clean .welcome-brand:before{right:49px;top:78px;font-size:10px}
 .member-v2-clean .welcome-sub{right:49px;top:101px;font-size:10px}
 .member-v2-clean .welcome-copy{margin-top:64px}
 .member-v2-clean .welcome-greeting{font-size:28px}
 .member-v2-clean .welcome-rule{left:50px;right:50px}
 .member-v2-clean .menu-heading{padding:18px 50px 10px}
 .member-v2-clean .menu-heading span{font-size:13px}
 .member-v2-clean .menu-heading p{font-size:17px}
 .member-v2-clean .menu-day-row{margin:0 29px}
 .member-v2-clean .menu-day-label{padding:17px 20px 10px}
 .member-v2-clean .menu-day-label span{font-size:21px}
 .member-v2-clean .menu-day-label em{font-size:16px}
 .member-v2-clean .menu-meals-stack{padding:0 20px}
 .member-v2-clean .menu-meal-line{grid-template-columns:91px minmax(0,1fr) 155px;gap:16px;min-height:124px}
}
@media(max-width:430px){
 .member-v2-clean .welcome-hero{padding:27px 30px 14px;min-height:275px}
 .member-v2-clean .welcome-brand{gap:10px}
 .member-v2-clean .welcome-brand svg{width:24px;height:38px}
 .member-v2-clean .welcome-brand span{font-size:25px}
 .member-v2-clean .welcome-brand:after{left:91px;top:67px;font-size:10px}
 .member-v2-clean .welcome-brand:before{right:29px;top:73px;font-size:8px}
 .member-v2-clean .welcome-sub{right:29px;top:91px;font-size:8px}
 .member-v2-clean .welcome-copy{margin-top:63px}
 .member-v2-clean .welcome-greeting{font-size:24px}
 .member-v2-clean .welcome-rule{left:30px;right:30px}
 .member-v2-clean .menu-heading{padding:17px 30px 10px}
 .member-v2-clean .menu-heading span{font-size:11px}
 .member-v2-clean .menu-heading p{font-size:15px;margin-top:6px}
 .member-v2-clean .menu-day-row{margin:0 18px}
 .member-v2-clean .menu-day-label{padding:15px 16px 9px}
 .member-v2-clean .menu-day-label span{font-size:18px}
 .member-v2-clean .menu-day-label em{font-size:14px}
 .member-v2-clean .menu-meals-stack{padding:0 16px}
 .member-v2-clean .menu-meal-line{grid-template-columns:72px minmax(0,1fr) 110px;gap:9px;min-height:108px;padding:15px 0}
 .member-v2-clean .meal-type-pill{min-width:66px;height:25px;padding:0 9px;font-size:10px}
 .member-v2-clean .menu-meal-copy>b{font-size:14px;margin-bottom:4px}
 .member-v2-clean .menu-meal-copy p{font-size:11px;line-height:1.35}
 .member-v2-clean .meal-allergens{margin-top:6px;gap:5px}
 .member-v2-clean .meal-allergen{font-size:8px;padding:3px 8px}
 .member-v2-clean .late-meal-action{min-width:105px;height:39px;padding:0 8px;gap:6px;font-size:10px}
 .member-v2-clean .late-meal-action svg{width:17px;height:17px}
 .member-v2-clean nav{height:76px;padding:7px 10px 10px}
 .member-v2-clean nav button{font-size:11px;gap:4px}
 .member-v2-clean nav button svg{width:25px;height:25px}
}
@media(min-width:761px){
 .member-v2-clean nav{left:50%;right:auto;transform:translateX(-50%);width:760px}
}`;