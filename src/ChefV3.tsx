import React,{useEffect,useMemo,useState}from"react";
import{AlertTriangle,Bell,Check,ChevronLeft,ChevronRight,Clock3,Edit3,Home as HomeIcon,Plus,Save,Send,Trash2,Utensils,X}from"lucide-react";
import{supabase}from"./lib/supabase";

type Props={user:any;profile:any};
type Meal={id:string;name:string;description:string|null;meal_date:string;meal_type:string;allergens:string[];menu_id:string|null};
type Notice={id:string;title:string;message:string;created_at:string;read:boolean};
type Late={id:string;meal_id:string;member_id:string;status:string;requested_at:string;notes:string|null};
const allergens=["Milk","Eggs","Wheat","Soy","Peanuts","Tree Nuts","Fish","Shellfish","Sesame"];
const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`};
const today=()=>iso(new Date());
const dateText=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const mealOrder=(m:Meal)=>m.meal_type==="lunch"?0:1;

export default function ChefV3({user,profile}:Props){
 const[tab,setTab]=useState("home"),[meals,setMeals]=useState<Meal[]>([]),[allergyRows,setAllergyRows]=useState<any[]>([]),[late,setLate]=useState<Late[]>([]),[notices,setNotices]=useState<Notice[]>([]);
 const[busy,setBusy]=useState(false),[error,setError]=useState(""),[toast,setToast]=useState("");
 const[weekOffset,setWeekOffset]=useState(0),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState<any>({}),[adding,setAdding]=useState<string|null>(null);
 const[newMeal,setNewMeal]=useState({meal_type:"dinner",name:"",description:"",allergens:[] as string[]});
 const[noticeTitle,setNoticeTitle]=useState(""),[noticeMessage,setNoticeMessage]=useState("");
 const weekStart=useMemo(()=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-d.getDay()+weekOffset*7);return d},[weekOffset]);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d}),[weekStart]);

 const load=async()=>{
   setError("");
   const menu=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(menu.error){setError(menu.error.message);return}
   const menuId=menu.data?.id;
   const start=iso(days[0]),end=iso(days[6]);
   const[m,a,l,n]=await Promise.all([
     menuId?supabase.from("meals").select("id,name,description,meal_date,meal_type,allergens,menu_id").eq("menu_id",menuId).gte("meal_date",start).lte("meal_date",end).order("meal_date"):Promise.resolve({data:[],error:null}),
     supabase.from("allergy_profiles").select("member_id,allergies,dietary_restrictions"),
     supabase.from("late_plate_requests").select("id,meal_id,member_id,status,requested_at,notes").neq("status","cancelled").order("requested_at",{ascending:false}).limit(50),
     supabase.from("notifications").select("id,title,message,created_at,read").order("created_at",{ascending:false}).limit(30)
   ]);
   const e=m.error||a.error||l.error||n.error;if(e)setError(e.message);
   setMeals(((m.data||[])as Meal[]).filter(x=>x.meal_type==="lunch"||x.meal_type==="dinner").sort((a,b)=>a.meal_date.localeCompare(b.meal_date)||mealOrder(a)-mealOrder(b)));
   setAllergyRows(a.data||[]);setLate(l.data||[]);setNotices(n.data||[]);
 };
 useEffect(()=>{void load()},[weekOffset]);

 const conflicts=useMemo(()=>meals.map(m=>{const hits=allergyRows.flatMap(a=>(a.allergies||[]).filter((x:string)=>(m.allergens||[]).includes(x)).map((x:string)=>({member:a.member_id,allergen:x})));return{...m,count:new Set(hits.map(x=>x.member)).size,matched:[...new Set(hits.map(x=>x.allergen))]}}).filter(x=>x.count),[meals,allergyRows]);
 const todayMeals=meals.filter(m=>m.meal_date===today()),openLate=late.filter(x=>["requested","preparing"].includes(x.status)).length,unread=notices.filter(x=>!x.read).length;

 const saveEdit=async()=>{
   if(!editing||!String(draft.name||"").trim())return;setBusy(true);
   const{error:e}=await supabase.from("meals").update({name:String(draft.name).trim(),description:String(draft.description||"").trim(),meal_type:draft.meal_type,allergens:draft.allergens||[],updated_at:new Date().toISOString()}).eq("id",editing);
   if(e)setError(e.message);else{setEditing(null);setDraft({});await load()}setBusy(false);
 };
 const deleteMeal=async(id:string)=>{if(!confirm("Delete this meal?"))return;setBusy(true);const{error:e}=await supabase.from("meals").delete().eq("id",id);if(e)setError(e.message);else await load();setBusy(false)};
 const addMeal=async(date:string)=>{
   if(!newMeal.name.trim())return;setBusy(true);
   const menu=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(menu.error||!menu.data){setError(menu.error?.message||"No active menu found.");setBusy(false);return}
   const{error:e}=await supabase.from("meals").insert({menu_id:menu.data.id,meal_date:date,meal_type:newMeal.meal_type,name:newMeal.name.trim(),description:newMeal.description.trim(),allergens:newMeal.allergens});
   if(e)setError(e.message);else{setAdding(null);setNewMeal({meal_type:"dinner",name:"",description:"",allergens:[]});await load()}setBusy(false);
 };
 const updateLate=async(id:string,status:string)=>{setBusy(true);const{error:e}=await supabase.from("late_plate_requests").update({status}).eq("id",id);if(e)setError(e.message);else await load();setBusy(false)};
 const markRead=async(id:string)=>{await supabase.from("notifications").update({read:true}).eq("id",id);await load()};
 const sendAnnouncement=async()=>{if(!noticeTitle.trim()||!noticeMessage.trim()){setToast("Title and message are required.");return}setBusy(true);const{data,error:e}=await supabase.rpc("send_member_announcement",{p_title:noticeTitle.trim(),p_message:noticeMessage.trim(),p_type:"announcement"});if(e)setToast(e.message);else{setToast(`${data||0} members notified.`);setNoticeTitle("");setNoticeMessage("")}setBusy(false)};

 const mealCard=(m:Meal)=><article className="chef3-meal"key={m.id}>
   <div className="chef3-meal-type"><span className={m.meal_type==="lunch"?"lunch":"dinner"}>{m.meal_type}</span></div>
   {editing===m.id?<div className="chef3-editor">
     <input value={draft.name||""}onChange={e=>setDraft((x:any)=>({...x,name:e.target.value}))}placeholder="Meal name"/>
     <select value={draft.meal_type||m.meal_type}onChange={e=>setDraft((x:any)=>({...x,meal_type:e.target.value}))}><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select>
     <textarea value={draft.description||""}onChange={e=>setDraft((x:any)=>({...x,description:e.target.value}))}placeholder="Description"/>
     <div className="chef3-chips">{allergens.map(a=><button type="button"key={a}className={(draft.allergens||[]).includes(a)?"selected":""}onClick={()=>setDraft((x:any)=>({...x,allergens:(x.allergens||[]).includes(a)?x.allergens.filter((v:string)=>v!==a):[...(x.allergens||[]),a]}))}>{a}</button>)}</div>
     <div className="chef3-actions"><button className="primary"onClick={saveEdit}disabled={busy}><Save size={15}/>Save</button><button onClick={()=>{setEditing(null);setDraft({})}}>Cancel</button></div>
   </div>:<><div className="chef3-copy"><b>{m.name}</b>{m.description&&<p>{m.description}</p>}{m.allergens?.length?<small><AlertTriangle size={12}/>{m.allergens.join(", ")}</small>:null}</div><div className="chef3-actions"><button onClick={()=>{setEditing(m.id);setDraft({...m,allergens:[...(m.allergens||[])]})}}><Edit3 size={14}/></button><button onClick={()=>deleteMeal(m.id)}><Trash2 size={14}/></button></div></>}
 </article>;

 const day= (d:Date)=>{
   const key=iso(d),list=meals.filter(m=>m.meal_date===key);
   return <section className={"chef3-day "+(key===today()?"today":"")}key={key}>
     <div className="chef3-day-head"><div><b>{key===today()?"TODAY":d.toLocaleDateString(undefined,{weekday:"short"}).toUpperCase()}</b><span>{d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></div><button onClick={()=>{setAdding(key);setNewMeal({meal_type:"dinner",name:"",description:"",allergens:[]})}}><Plus size={15}/>Add</button></div>
     {list.map(mealCard)}
     {!list.length&&!adding?<p className="chef3-empty">No meals posted.</p>:null}
     {adding===key&&<div className="chef3-editor add"><div className="chef3-row"><select value={newMeal.meal_type}onChange={e=>setNewMeal(x=>({...x,meal_type:e.target.value}))}><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select><input autoFocus value={newMeal.name}onChange={e=>setNewMeal(x=>({...x,name:e.target.value}))}placeholder="Meal name"/></div><textarea value={newMeal.description}onChange={e=>setNewMeal(x=>({...x,description:e.target.value}))}placeholder="Description"/><div className="chef3-chips">{allergens.map(a=><button type="button"key={a}className={newMeal.allergens.includes(a)?"selected":""}onClick={()=>setNewMeal(x=>({...x,allergens:x.allergens.includes(a)?x.allergens.filter(v=>v!==a):[...x.allergens,a]}))}>{a}</button>)}</div><div className="chef3-actions"><button className="primary"onClick={()=>addMeal(key)}disabled={busy}><Save size={15}/>Save</button><button onClick={()=>setAdding(null)}>Cancel</button></div></div>}
   </section>
 };

 const Header=()=> <header className="chef3-header"><div className="chef3-brand"><Utensils size={19}/><div><b>HOUSEEATS</b><small>TASTEFUL TRADITIONS · CHEF</small></div></div><button className="chef3-bell"onClick={()=>setTab("alerts")}><Bell size={19}/>{unread>0&&<em>{unread}</em>}</button></header>;
 const Home=()=> <><Header/><section className="chef3-greeting"><span>CHEF WORKSPACE</span><p>Good {new Date().getHours()<12?"morning":new Date().getHours()<18?"afternoon":"evening"},</p><h1>{String(profile?.full_name||"Chef").split(" ")[0]}.</h1><small>Here’s what’s being served.</small></section><main className="chef3-main"><div className="chef3-stats"><button onClick={()=>setTab("menu")}><Utensils/><b>{todayMeals.length}</b><span>Meals today</span></button><button onClick={()=>setTab("allergies")}><AlertTriangle/><b>{conflicts.filter(x=>x.meal_date===today()).length}</b><span>Allergy alerts</span></button><button onClick={()=>setTab("late")}><Clock3/><b>{openLate}</b><span>Late plates</span></button></div><div className="chef3-section"><div className="chef3-section-title"><span>TODAY</span><h2>Lunch & Dinner</h2></div>{todayMeals.length?todayMeals.map(mealCard):<p className="chef3-empty">No meals posted for today.</p>}</div></main></>;

 const Menu=()=> <><Header/><main className="chef3-main chef3-menu"><div className="chef3-page-title"><span>MENU MANAGEMENT</span><h1>Rolling menu</h1><p>Lunch and dinner, one day at a time.</p><div className="chef3-week-nav"><button onClick={()=>setWeekOffset(x=>x-1)}><ChevronLeft/></button><button onClick={()=>setWeekOffset(0)}>Today</button><button onClick={()=>setWeekOffset(x=>x+1)}><ChevronRight/></button></div></div>{days.map(day)}</main></>;

 const Alerts=()=> <><Header/><main className="chef3-main"><div className="chef3-page-title"><span>KITCHEN SAFETY</span><h1>Allergy alerts</h1><p>Only matching meal and allergy information is shown.</p></div>{conflicts.length?conflicts.map(c=><article className="chef3-alert"key={c.id}><AlertTriangle/><div><b>{dateText(c.meal_date)} · {c.meal_type}</b><h3>{c.name}</h3><p>{c.count} member{c.count!==1?"s":""} match: {c.matched.join(", ")}</p></div></article>):<div className="chef3-empty large"><Check/>No current conflicts.</div>}</main></>;

 const Late=()=> <><Header/><main className="chef3-main"><div className="chef3-page-title"><span>DINING SUPPORT</span><h1>Late plates</h1><p>Move requests through the kitchen.</p></div>{late.length?late.map(l=><article className="chef3-service"key={l.id}><div><b>{meals.find(m=>m.id===l.meal_id)?.name||"Meal"}</b><small>{l.status} · {new Date(l.requested_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</small></div>{l.status==="requested"&&<button className="primary"onClick={()=>updateLate(l.id,"preparing")}>Prepare</button>}{l.status==="preparing"&&<button className="primary"onClick={()=>updateLate(l.id,"ready")}>Ready</button>}{l.status==="ready"&&<button className="primary"onClick={()=>updateLate(l.id,"picked_up")}>Picked up</button>}</article>):<div className="chef3-empty large"><Clock3/>No active late plates.</div>}</main></>;

 const AlertsInbox=()=> <><Header/><main className="chef3-main"><div className="chef3-page-title"><span>INBOX</span><h1>Alerts</h1><p>Chapter and kitchen notifications.</p></div>{notices.length?notices.map(n=><button className={"chef3-notice "+(n.read?"read":"")}key={n.id}onClick={()=>markRead(n.id)}><span/><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleDateString()}</small></div></button>):<div className="chef3-empty large"><Bell/>You're all caught up.</div>}</main></>;

 const Notify=()=> <><Header/><main className="chef3-main"><div className="chef3-page-title"><span>CHAPTER COMMUNICATION</span><h1>Notify members</h1><p>Send one clear announcement to the chapter.</p></div><section className="chef3-form"><label>Title<input value={noticeTitle}onChange={e=>setNoticeTitle(e.target.value)}placeholder="Announcement title"/></label><label>Message<textarea rows={6}value={noticeMessage}onChange={e=>setNoticeMessage(e.target.value)}placeholder="Message for members"/></label><button className="primary wide"onClick={sendAnnouncement}disabled={busy}><Send size={16}/>{busy?"Sending…":"Send notification"}</button>{toast&&<p className="chef3-toast">{toast}</p>}</section></main></>;

 return <div className="chef3">{error&&<div className="chef3-error">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}{tab==="home"&&<Home/>}{tab==="menu"&&<Menu/>}{tab==="allergies"&&<Alerts/>}{tab==="late"&&<Late/>}{tab==="alerts"&&<AlertsInbox/>}{tab==="notify"&&<Notify/>}<nav className="chef3-nav">{[["home","Home",HomeIcon],["menu","Menu",Utensils],["allergies","Allergies",AlertTriangle],["late","Late",Clock3],["notify","Notify",Send]].map(([id,label,Icon]:any)=><button key={id}className={tab===id?"active":""}onClick={()=>setTab(id)}><Icon size={19}/><span>{label}</span>{id==="allergies"&&conflicts.filter(x=>x.meal_date===today()).length>0?<em>{conflicts.filter(x=>x.meal_date===today()).length}</em>:null}</button>)}</nav></div>
}
