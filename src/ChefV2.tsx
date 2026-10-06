import React,{useEffect,useMemo,useState}from"react";
import{AlertTriangle,Bell,ChevronLeft,ChevronRight,Clock3,Edit3,Plus,Printer,Save,Send,Trash2,UtensilsCrossed,X,Users,CalendarDays}from"lucide-react";
import{supabase}from"./lib/supabase";

type Props={user:any;profile:any};
type Meal={id:string;name:string;description:string|null;meal_date:string;meal_type:string;allergens:string[];menu_id:string|null;week_number:number;day_of_week:number};
type Late={id:string;meal_id:string;user_id:string;status:string;created_at:string;notes:string|null};
const allergens=["Milk","Eggs","Wheat","Soy","Peanuts","Tree Nuts","Fish","Shellfish","Sesame"];
const order=["lunch","dinner"];
const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`};
const monday=(d:Date)=>{const x=new Date(d);x.setHours(12,0,0,0);const n=x.getDay();x.setDate(x.getDate()-(n===0?6:n-1));return x};
const dateLabel=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const sortMeals=(a:Meal[])=>[...a].sort((x,y)=>x.meal_date.localeCompare(y.meal_date)||order.indexOf(x.meal_type)-order.indexOf(y.meal_type));
const monthCells=(d:Date)=>{const first=new Date(d.getFullYear(),d.getMonth(),1,12),last=new Date(d.getFullYear(),d.getMonth()+1,0,12);const start=new Date(first);start.setDate(first.getDate()-(first.getDay()||7)+1);const end=new Date(last);end.setDate(last.getDate()+(7-(last.getDay()||7)));const out=[];for(let x=new Date(start);x<=end;x.setDate(x.getDate()+1))out.push(new Date(x));return out};

export default function ChefV2({user,profile}:Props){
 const[tab,setTab]=useState("today"),[meals,setMeals]=useState<Meal[]>([]),[allergyRows,setAllergyRows]=useState<any[]>([]),[late,setLate]=useState<Late[]>([]),[rsvps,setRsvps]=useState<any[]>([]),[notices,setNotices]=useState<any[]>([]);
 const[menuId,setMenuId]=useState<string|null>(null),[menuStart,setMenuStart]=useState<string|null>(null),[month,setMonth]=useState(()=>new Date()),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState<Partial<Meal>>({}),[adding,setAdding]=useState<string|null>(null),[newDraft,setNewDraft]=useState({meal_type:"dinner",name:"",description:"",allergens:[]as string[]}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[noticeTitle,setNoticeTitle]=useState(""),[noticeMessage,setNoticeMessage]=useState(""),[noticeStatus,setNoticeStatus]=useState("");

 const load=async()=>{
  setError("");
  const menu=await supabase.from("menus").select("id,start_date").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(menu.error){setError(menu.error.message);return}
  const id=menu.data?.id||null;setMenuId(id);setMenuStart(menu.data?.start_date||null);
  if(!id){setMeals([]);return}
  const start=new Date(new Date().getFullYear(),new Date().getMonth()-1,1,12),end=new Date(new Date().getFullYear(),new Date().getMonth()+2,0,12);
  const[m,a,l,r,n]=await Promise.all([
   supabase.from("meals").select("id,name,description,meal_date,meal_type,allergens,menu_id,week_number,day_of_week").eq("menu_id",id).gte("meal_date",iso(start)).lte("meal_date",iso(end)).order("meal_date"),
   supabase.from("member_allergies").select("user_id,allergen"),
   supabase.from("late_plates").select("id,meal_id,user_id,status,created_at,notes").neq("status","cancelled").order("created_at",{ascending:false}),
   supabase.from("rsvps").select("id,meal_id,user_id,attending"),
   supabase.from("notifications").select("id,title,message,created_at,read").is("user_id",null).order("created_at",{ascending:false}).limit(20)
  ]);
  const e=m.error||a.error||l.error||r.error||n.error;if(e)setError(e.message);
  setMeals(sortMeals(((m.data||[])as Meal[]).filter(x=>order.includes(x.meal_type))));
  setAllergyRows(a.data||[]);setLate((l.data||[])as Late[]);setRsvps(r.data||[]);setNotices(n.data||[]);
 };
 useEffect(()=>{void load()},[]);

 const today=iso(new Date()), todayMeals=useMemo(()=>sortMeals(meals.filter(m=>m.meal_date===today)),[meals,today]);
 const unread=notices.filter(n=>!n.read).length, openLate=late.filter(x=>x.status==="requested").length;
 const conflicts=useMemo(()=>meals.map(m=>{const hits=allergyRows.filter(a=>(m.allergens||[]).includes(a.allergen));return{...m,count:new Set(hits.map(x=>x.user_id)).size,matched:[...new Set(hits.map(x=>x.allergen))]}}).filter(x=>x.count>0),[meals,allergyRows]);
 const headcount=(id:string)=>rsvps.filter(r=>r.meal_id===id&&r.attending!==false).length;
 const monthDays=useMemo(()=>monthCells(month),[month]);
 const menuWeek=(date:string)=>{if(!menuStart)return 1;const a=new Date(menuStart+"T12:00:00"),b=new Date(date+"T12:00:00");return Math.min(4,Math.max(1,Math.floor((b.getTime()-a.getTime())/86400000/7)+1))};
 const menuDay=(date:string)=>{const d=new Date(date+"T12:00:00").getDay();return d===0?7:d};

 async function saveEdit(){
  if(!editing||busy)return;setBusy(true);const p={name:String(draft.name||"").trim(),description:String(draft.description||"").trim(),meal_type:String(draft.meal_type||"dinner"),allergens:draft.allergens||[],updated_at:new Date().toISOString()};
  const{error:e}=await supabase.from("meals").update(p).eq("id",editing);if(e)setError(e.message);else{setEditing(null);setDraft({});await load()}setBusy(false);
 }
 async function deleteMeal(id:string){if(!window.confirm("Delete this meal?"))return;setBusy(true);const{error:e}=await supabase.from("meals").delete().eq("id",id);if(e)setError(e.message);else await load();setBusy(false)}
 async function addMeal(date:string){
  if(!newDraft.name.trim()||!menuId)return;setBusy(true);
  const{error:e}=await supabase.from("meals").insert({menu_id:menuId,week_number:menuWeek(date),day_of_week:menuDay(date),meal_date:date,meal_type:newDraft.meal_type,name:newDraft.name.trim(),description:newDraft.description.trim(),allergens:newDraft.allergens});
  if(e)setError(e.message);else{setAdding(null);setNewDraft({meal_type:"dinner",name:"",description:"",allergens:[]});await load()}setBusy(false);
 }
 async function updateLate(id:string,status:string){setBusy(true);const{error:e}=await supabase.from("late_plates").update({status}).eq("id",id);if(e)setError(e.message);else await load();setBusy(false)}
 async function sendAnnouncement(){if(!noticeTitle.trim()||!noticeMessage.trim()){setNoticeStatus("Title and message are required.");return}setBusy(true);const{data,error:e}=await supabase.rpc("send_member_announcement",{p_title:noticeTitle.trim(),p_message:noticeMessage.trim(),p_type:"announcement"});setBusy(false);if(e)setNoticeStatus(e.message);else{setNoticeStatus(`${data||0} members notified.`);setNoticeTitle("");setNoticeMessage("")}}

 const editor=(m:Meal)=><div className="chef-editor">
  <div className="chef-editor-row"><select value={String(draft.meal_type||m.meal_type)}onChange={e=>setDraft(x=>({...x,meal_type:e.target.value}))}><option value="lunch">lunch</option><option value="dinner">dinner</option></select><input value={String(draft.name||"")}onChange={e=>setDraft(x=>({...x,name:e.target.value}))}placeholder="Meal name"/></div>
  <textarea value={String(draft.description||"")}onChange={e=>setDraft(x=>({...x,description:e.target.value}))}placeholder="Description"/>
  <div className="chef-chips">{allergens.map(a=><button type="button"key={a}className={(draft.allergens||[]).includes(a)?"selected":""}onClick={()=>setDraft(x=>({...x,allergens:(x.allergens||[]).includes(a)?(x.allergens||[]).filter(v=>v!==a):[...(x.allergens||[]),a]}))}>{a}</button>)}</div>
  <div className="chef-editor-actions"><button className="chef-primary"onClick={saveEdit}disabled={busy}><Save size={15}/>Save</button><button onClick={()=>{setEditing(null);setDraft({})}}>Cancel</button></div>
 </div>;

 const mealCard=(m:Meal)=><article className="chef-meal-card"key={m.id}>{editing===m.id?editor(m):<><div className="chef-meal-copy"><span>{m.meal_type}</span><h3>{m.name}</h3>{m.description&&<p>{m.description}</p>}<small><Users size={12}/>{headcount(m.id)} RSVP{headcount(m.id)!==1?"s":""}{m.allergens?.length?<> · <AlertTriangle size={12}/>{m.allergens.join(", ")}</>:null}</small></div><div className="chef-meal-actions"><button onClick={()=>{setEditing(m.id);setDraft({...m,allergens:[...(m.allergens||[])]})}}><Edit3 size={14}/>Edit</button><button onClick={()=>deleteMeal(m.id)}aria-label="Delete meal"><Trash2 size={14}/></button></div></>}</article>;

 const addEditor=(date:string)=><div className="chef-editor chef-add-editor"><div className="chef-editor-row"><select value={newDraft.meal_type}onChange={e=>setNewDraft(x=>({...x,meal_type:e.target.value}))}><option value="lunch">lunch</option><option value="dinner">dinner</option></select><input autoFocus placeholder="Meal name"value={newDraft.name}onChange={e=>setNewDraft(x=>({...x,name:e.target.value}))}/></div><textarea placeholder="Description"value={newDraft.description}onChange={e=>setNewDraft(x=>({...x,description:e.target.value}))}/><div className="chef-chips">{allergens.map(a=><button type="button"key={a}className={newDraft.allergens.includes(a)?"selected":""}onClick={()=>setNewDraft(x=>({...x,allergens:x.allergens.includes(a)?x.allergens.filter(v=>v!==a):[...x.allergens,a]}))}>{a}</button>)}</div><div className="chef-editor-actions"><button className="chef-primary"onClick={()=>addMeal(date)}disabled={busy}><Save size={15}/>Save meal</button><button onClick={()=>setAdding(null)}>Cancel</button></div></div>;

 const monthly=<section className="chef-card chef-month"><div className="chef-card-head"><div><span>MENU MANAGEMENT</span><h2>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h2><p className="chef-muted">Lunch & Dinner · full month</p></div><div className="chef-week-controls"><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft size={16}/></button><button onClick={()=>setMonth(new Date())}>Today</button><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight size={16}/></button><button onClick={()=>window.print()}><Printer size={15}/></button></div></div><div style={{display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:6}}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=><b key={x}style={{fontSize:10,textAlign:"center",padding:"5px",color:"#62738a"}}>{x}</b>)}{monthDays.map(d=>{const ds=iso(d),dayMeals=sortMeals(meals.filter(m=>m.meal_date===ds)),outside=d.getMonth()!==month.getMonth();return <div key={ds}style={{minHeight:118,padding:7,border:"1px solid #e1e7ee",borderRadius:10,background:outside?"#f7f9fb":"#fff",opacity:outside?.7:1}}><div style={{fontWeight:800,fontSize:11,marginBottom:5}}>{d.getDate()}</div>{dayMeals.map(mealCard)}<button className="chef-add"onClick={()=>{setAdding(ds);setNewDraft({meal_type:"dinner",name:"",description:"",allergens:[]})}}><Plus size={12}/>Add</button>{adding===ds&&addEditor(ds)}</div>})}</div></section>;

 return <div className="chef-v2">
  <header className="chef-header"><div className="chef-brand"><div className="chef-brand-mark"><UtensilsCrossed size={19}/></div><div><b>Tasteful Traditions</b><small>HouseEats • Chef</small></div></div><div className="chef-actions"><button onClick={()=>setTab("notifications")}aria-label="Notifications"><Bell size={19}/>{unread>0&&<i>{unread}</i>}</button><button className="chef-avatar"aria-label="Account">{(profile?.full_name||"Chef").slice(0,1).toUpperCase()}</button></div></header>
  {error&&<div className="chef-error">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
  {tab==="today"&&<main className="chef-main"><section className="chef-hero"><span>CHEF WORKSPACE</span><h1>Good afternoon, {profile?.full_name?.split(" ")[0]||"Chef"}</h1><p>Today's service, headcount, allergies and late plates in one place.</p></section><div className="chef-stats"><button onClick={()=>setTab("menu")}><UtensilsCrossed/><b>{todayMeals.length}</b><span>Meals today</span></button><button onClick={()=>setTab("allergies")}><AlertTriangle/><b>{conflicts.filter(x=>x.meal_date===today).length}</b><span>Allergy alerts</span></button><button onClick={()=>setTab("late")}><Clock3/><b>{openLate}</b><span>Late plates</span></button></div><section className="chef-card"><div className="chef-card-head"><div><span>TODAY</span><h2>Lunch & Dinner</h2></div><button onClick={()=>window.print()}><Printer size={15}/>Print</button></div>{todayMeals.map(mealCard)}{!todayMeals.length&&<div className="chef-none">No lunch or dinner posted for today.</div>}</section></main>}
  {tab==="menu"&&<main className="chef-main">{monthly}</main>}
  {tab==="allergies"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>AUTHORIZED KITCHEN VIEW</span><h2>Allergy alerts</h2></div><AlertTriangle/></div>{conflicts.map(c=><article className="chef-alert"key={c.id}><AlertTriangle/><div><b>{dateLabel(c.meal_date)} • {c.meal_type}</b><h3>{c.name}</h3><p>{c.count} member{c.count!==1?"s":""} match: {c.matched.join(", ")}</p></div></article>)}{!conflicts.length&&<div className="chef-none">No current conflicts.</div>}</section></main>}
  {tab==="late"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>DINING SUPPORT</span><h2>Late plates</h2></div><Clock3/></div>{late.map(l=><article className="chef-service"key={l.id}><div><b>{meals.find(m=>m.id===l.meal_id)?.name||"Meal"}</b><small>{l.status} · {l.notes||"No notes"} · {l.created_at?new Date(l.created_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):""}</small></div>{l.status==="requested"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"preparing")}>Prepare</button>}{l.status==="preparing"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"ready")}>Ready</button>}{l.status==="ready"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"picked_up")}>Picked up</button>}</article>)}{!late.length&&<div className="chef-none">No active late plates.</div>}</section></main>}
  {tab==="notify"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>CHAPTER COMMUNICATION</span><h2>Notify members</h2></div><Send/></div><input placeholder="Announcement title"value={noticeTitle}onChange={e=>setNoticeTitle(e.target.value)}/><textarea placeholder="Message for members"rows={6}value={noticeMessage}onChange={e=>setNoticeMessage(e.target.value)}/><button className="chef-primary chef-wide"onClick={sendAnnouncement}disabled={busy}><Send size={16}/>{busy?"Sending…":"Send notification"}</button>{noticeStatus&&<div className="chef-status">{noticeStatus}</div>}</section></main>}
  {tab==="notifications"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>UPDATES</span><h2>Notifications</h2></div><Bell/></div>{notices.map(n=><div className="chef-notice"key={n.id}><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small></div>)}{!notices.length&&<div className="chef-none">No notifications.</div>}</section></main>}
  <nav className="chef-nav">{[["today","Home"],["menu","Menu"],["allergies","Allergies"],["late","Late"],["notify","Notify"]].map(([k,l])=><button key={k}className={tab===k?"active":""}onClick={()=>setTab(k)}><span>{l}</span>{k==="allergies"&&conflicts.filter(x=>x.meal_date===today).length>0&&<i>{conflicts.filter(x=>x.meal_date===today).length}</i>}</button>)}</nav>
 </div>
}