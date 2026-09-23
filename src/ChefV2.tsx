import React,{useEffect,useMemo,useState}from"react";
import{AlertTriangle,Bell,Check,ChevronLeft,ChevronRight,Clock3,Edit3,Plus,Printer,Save,Send,Trash2,UtensilsCrossed,X}from"lucide-react";
import{supabase}from"./lib/supabase";

type Props={user:any;profile:any};
type Meal={id:string;name:string;description:string|null;meal_date:string;meal_type:string;allergens:string[];menu_id:string|null};
const allergens=["Milk","Eggs","Wheat","Soy","Peanuts","Tree Nuts","Fish","Shellfish","Sesame"];
const order=["lunch","dinner"];
const iso=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`};
const startOfWeek=(d:Date)=>{const x=new Date(d);x.setHours(12,0,0,0);x.setDate(x.getDate()-x.getDay());return x};
const dateLabel=(s:string)=>new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
const sortMeals=(items:Meal[])=>[...items].sort((a,b)=>a.meal_date.localeCompare(b.meal_date)||(order.indexOf(a.meal_type.toLowerCase())-order.indexOf(b.meal_type.toLowerCase())));

export default function ChefV2({user,profile}:Props){
 const[tab,setTab]=useState("today"),[meals,setMeals]=useState<Meal[]>([]),[allergyRows,setAllergyRows]=useState<any[]>([]),[late,setLate]=useState<any[]>([]),[notices,setNotices]=useState<any[]>([]),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState<Partial<Meal>>({}),[adding,setAdding]=useState<string|null>(null),[newDraft,setNewDraft]=useState({meal_type:"dinner",name:"",description:"",allergens:[]as string[]}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[noticeTitle,setNoticeTitle]=useState(""),[noticeMessage,setNoticeMessage]=useState(""),[noticeStatus,setNoticeStatus]=useState("");
 const[weekOffset,setWeekOffset]=useState(0);
 const weekStart=useMemo(()=>{const d=startOfWeek(new Date());d.setDate(d.getDate()+weekOffset*7);return d},[weekOffset]);
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d}),[weekStart]);
 const nextWeek=useMemo(()=>days.map(d=>{const x=new Date(d);x.setDate(x.getDate()+7);return x}),[days]);
 const rangeStart=iso(days[0]),rangeEnd=iso(nextWeek[6]);

 async function load(){
  setError("");
  const menu=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(menu.error){setError(menu.error.message);return}
  const menuId=menu.data?.id;
  const[m,a,l,n]=await Promise.all([
   menuId?supabase.from("meals").select("id,name,description,meal_date,meal_type,allergens,menu_id").eq("menu_id",menuId).gte("meal_date",rangeStart).lte("meal_date",rangeEnd).order("meal_date"):Promise.resolve({data:[],error:null}),
   supabase.from("allergy_profiles").select("member_id,allergies,dietary_restrictions"),
   supabase.from("late_plate_requests").select("id,meal_id,member_id,status,requested_at,notes").neq("status","cancelled").gte("requested_at",new Date(new Date().setHours(0,0,0,0)).toISOString()),
   supabase.from("notifications").select("id,title,message,created_at,read").order("created_at",{ascending:false}).limit(30)
  ]);
  const e=m.error||a.error||l.error||n.error;if(e)setError(e.message);
  setMeals(sortMeals(((m.data||[])as Meal[]).filter(x=>order.includes(x.meal_type.toLowerCase()))));
  setAllergyRows(a.data||[]);setLate(l.data||[]);setNotices(n.data||[]);
 }
 useEffect(()=>{void load()},[rangeStart,rangeEnd]);

 const today=iso(new Date());
 const todayMeals=meals.filter(m=>m.meal_date===today);
 const unread=notices.filter(n=>!n.read).length;
 const openLate=late.filter(x=>x.status==="requested").length;
 const conflicts=useMemo(()=>meals.map(m=>{const hits=allergyRows.flatMap(a=>(a.allergies||[]).filter((x:string)=>(m.allergens||[]).includes(x)).map((x:string)=>({member_id:a.member_id,allergen:x})));return{...m,count:new Set(hits.map(x=>x.member_id)).size,matched:[...new Set(hits.map(x=>x.allergen))]}}).filter(x=>x.count),[meals,allergyRows]);
 const weekMeals=(list:Date[])=>list.map(d=>({date:d,meals:sortMeals(meals.filter(m=>m.meal_date===iso(d)))}));

 async function saveEdit(){
  if(!editing||busy)return;setBusy(true);setError("");
  const payload={name:String(draft.name||"").trim(),description:String(draft.description||"").trim(),meal_type:String(draft.meal_type||"dinner"),allergens:draft.allergens||[],updated_at:new Date().toISOString()};
  const{error:e}=await supabase.from("meals").update(payload).eq("id",editing);
  if(e)setError(e.message);else{setEditing(null);setDraft({});await load()}setBusy(false);
 }
 async function deleteMeal(id:string){if(!confirm("Delete this meal from the menu?"))return;setBusy(true);const{error:e}=await supabase.from("meals").delete().eq("id",id);if(e)setError(e.message);else await load();setBusy(false)}
 async function addMeal(date:string){
  if(!newDraft.name.trim())return;setBusy(true);
  const menu=await supabase.from("menus").select("id").eq("active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(menu.error||!menu.data){setError(menu.error?.message||"No active menu found.");setBusy(false);return}
  const{error:e}=await supabase.from("meals").insert({menu_id:menu.data.id,meal_date:date,meal_type:newDraft.meal_type,name:newDraft.name.trim(),description:newDraft.description.trim(),allergens:newDraft.allergens});
  if(e)setError(e.message);else{setAdding(null);setNewDraft({meal_type:"dinner",name:"",description:"",allergens:[]});await load()}setBusy(false);
 }
 async function updateLate(id:string,status:string){setBusy(true);const{error:e}=await supabase.from("late_plate_requests").update({status}).eq("id",id);if(e)setError(e.message);else await load();setBusy(false)}
 async function sendAnnouncement(){if(!noticeTitle.trim()||!noticeMessage.trim()){setNoticeStatus("Title and message are required.");return}setBusy(true);const{data,error:e}=await supabase.rpc("send_member_announcement",{p_title:noticeTitle.trim(),p_message:noticeMessage.trim(),p_type:"announcement"});setBusy(false);if(e)setNoticeStatus(e.message);else{setNoticeStatus(`${data||0} members notified.`);setNoticeTitle("");setNoticeMessage("")}}

 const mealCard=(m:Meal)=><article className="chef-meal-card"key={m.id}>
  {editing===m.id?<div className="chef-editor">
   <div className="chef-editor-row"><select value={String(draft.meal_type||m.meal_type)}onChange={e=>setDraft(x=>({...x,meal_type:e.target.value}))}><option>lunch</option><option>dinner</option></select><input value={String(draft.name||"")}onChange={e=>setDraft(x=>({...x,name:e.target.value}))}placeholder="Meal name"/></div>
   <textarea value={String(draft.description||"")}onChange={e=>setDraft(x=>({...x,description:e.target.value}))}placeholder="Description"/>
   <div className="chef-chips">{allergens.map(a=><button type="button"key={a}className={(draft.allergens||[]).includes(a)?"selected":""}onClick={()=>setDraft(x=>({...x,allergens:(x.allergens||[]).includes(a)?(x.allergens||[]).filter(v=>v!==a):[...(x.allergens||[]),a]}))}>{a}</button>)}</div>
   <div className="chef-editor-actions"><button className="chef-primary"onClick={saveEdit}disabled={busy}><Save size={15}/>Save</button><button onClick={()=>{setEditing(null);setDraft({})}}>Cancel</button></div>
  </div>:<><div className="chef-meal-copy"><span>{m.meal_type}</span><h3>{m.name}</h3>{m.description&&<p>{m.description}</p>}{m.allergens?.length>0&&<small><AlertTriangle size={12}/> {m.allergens.join(", ")}</small>}</div><div className="chef-meal-actions"><button onClick={()=>{setEditing(m.id);setDraft({...m,allergens:[...(m.allergens||[])]})}}><Edit3 size={14}/>Edit</button><button aria-label="Delete meal"onClick={()=>deleteMeal(m.id)}><Trash2 size={14}/></button></div></>}
 </article>;

 const weekSection=(label:string,list:Date[])=> <section className="chef-week"><div className="chef-week-title"><span>{label}</span></div><div className="chef-days">{weekMeals(list).map(({date,meals:dayMeals})=>{const ds=iso(date);return <div className={"chef-day "+(ds===today?"today":"")}key={ds}><div className="chef-date"><b>{date.toLocaleDateString(undefined,{weekday:"short"})}</b><span>{date.toLocaleDateString(undefined,{month:"short",day:"numeric"})}</span></div><div className="chef-day-meals">{dayMeals.map(mealCard)}{!dayMeals.length&&<div className="chef-none">No lunch or dinner posted</div>}<button className="chef-add"onClick={()=>{setAdding(ds);setNewDraft({meal_type:"dinner",name:"",description:"",allergens:[]})}}><Plus size={14}/>Add meal</button>{adding===ds&&<div className="chef-editor chef-add-editor"><div className="chef-editor-row"><select value={newDraft.meal_type}onChange={e=>setNewDraft(x=>({...x,meal_type:e.target.value}))}><option>lunch</option><option>dinner</option></select><input autoFocus placeholder="Meal name"value={newDraft.name}onChange={e=>setNewDraft(x=>({...x,name:e.target.value}))}/></div><textarea placeholder="Description"value={newDraft.description}onChange={e=>setNewDraft(x=>({...x,description:e.target.value}))}/><div className="chef-chips">{allergens.map(a=><button type="button"key={a}className={newDraft.allergens.includes(a)?"selected":""}onClick={()=>setNewDraft(x=>({...x,allergens:x.allergens.includes(a)?x.allergens.filter(v=>v!==a):[...x.allergens,a]}))}>{a}</button>)}</div><div className="chef-editor-actions"><button className="chef-primary"onClick={()=>addMeal(ds)}disabled={busy}><Save size={15}/>Save meal</button><button onClick={()=>setAdding(null)}>Cancel</button></div></div>}</div></div>})}</div></section>;

 return <div className="chef-v2">
  <header className="chef-header"><div className="chef-brand"><div className="chef-brand-mark"><UtensilsCrossed size={19}/></div><div><b>Tasteful Traditions</b><small>HouseEats • Chef</small></div></div><div className="chef-actions"><button onClick={()=>setTab("notifications")}aria-label="Notifications"><Bell size={19}/>{unread>0&&<i>{unread}</i>}</button><button className="chef-avatar"aria-label="Account">{(profile?.full_name||"Chef").slice(0,1).toUpperCase()}</button></div></header>
  {error&&<div className="chef-error">{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
  {tab==="today"&&<main className="chef-main">
   <section className="chef-hero"><span>CHEF WORKSPACE</span><h1>Good morning, {profile?.full_name?.split(" ")[0]||"Chef"}</h1><p>Manage today's service, the rolling menu, allergies and late plates.</p></section>
   <div className="chef-stats"><button onClick={()=>setTab("menu")}><UtensilsCrossed/><b>{todayMeals.length}</b><span>Meals today</span></button><button onClick={()=>setTab("allergies")}><AlertTriangle/><b>{conflicts.filter(x=>x.meal_date===today).length}</b><span>Allergy alerts</span></button><button onClick={()=>setTab("late")}><Clock3/><b>{openLate}</b><span>Late plates</span></button></div>
   <section className="chef-card"><div className="chef-card-head"><div><span>TODAY</span><h2>Lunch & Dinner</h2></div><button onClick={()=>window.print()}><Printer size={15}/>Print</button></div>{todayMeals.map(mealCard)}{!todayMeals.length&&<div className="chef-none">No lunch or dinner posted for today.</div>}</section>
   <section className="chef-card"><div className="chef-card-head"><div><span>MENU</span><h2>Rolling calendar</h2></div><button onClick={()=>setTab("menu")}>Open menu <ChevronRight size={15}/></button></div><p className="chef-muted">This week and next week. Lunch and dinner only.</p>{weekSection("THIS WEEK",days)}{weekSection("NEXT WEEK",nextWeek)}</section>
  </main>}
  {tab==="menu"&&<main className="chef-main"><div className="chef-page-head"><div><span>MENU MANAGEMENT</span><h1>Rolling menu</h1><p>Sunday through Saturday • Lunch & Dinner</p></div><div className="chef-week-controls"><button onClick={()=>setWeekOffset(x=>x-1)}><ChevronLeft/></button><button onClick={()=>setWeekOffset(0)}>Today</button><button onClick={()=>setWeekOffset(x=>x+1)}><ChevronRight/></button></div></div>{weekSection("THIS WEEK",days)}{weekSection("NEXT WEEK",nextWeek)}</main>}
  {tab==="allergies"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>AUTHORIZED KITCHEN VIEW</span><h2>Allergy alerts</h2></div><AlertTriangle/></div><p className="chef-muted">Only meal/allergy matches are shown here for kitchen use.</p>{conflicts.map(c=><article className="chef-alert"key={c.id}><AlertTriangle/><div><b>{dateLabel(c.meal_date)} • {c.meal_type}</b><h3>{c.name}</h3><p>{c.count} member{c.count!==1?"s":""} match: {c.matched.join(", ")}</p></div></article>)}{!conflicts.length&&<div className="chef-none"><Check/>No current conflicts.</div>}</section></main>}
  {tab==="late"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>DINING SUPPORT</span><h2>Late plates</h2></div><Clock3/></div><p className="chef-muted">Move each request through the kitchen workflow.</p>{late.map(l=><article className="chef-service"key={l.id}><div><b>{meals.find(m=>m.id===l.meal_id)?.name||"Meal"}</b><small>{l.status} • {l.requested_at?new Date(l.requested_at).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):""}</small></div>{l.status==="requested"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"preparing")}>Prepare</button>}{l.status==="preparing"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"ready")}>Ready</button>}{l.status==="ready"&&<button className="chef-primary"onClick={()=>updateLate(l.id,"picked_up")}>Picked up</button>}</article>)}{!late.length&&<div className="chef-none">No active late plates.</div>}</section></main>}
  {tab==="notifications"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>INBOX</span><h2>Updates</h2></div><Bell/></div>{notices.map(n=><button className={"chef-notice "+(n.read?"read":"")}key={n.id}onClick={async()=>{await supabase.from("notifications").update({read:true}).eq("id",n.id);await load()}}><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.created_at).toLocaleDateString()}</small></button>)}{!notices.length&&<div className="chef-none">No notifications.</div>}</section></main>}
  {tab==="notify"&&<main className="chef-main"><section className="chef-card"><div className="chef-card-head"><div><span>CHAPTER COMMUNICATION</span><h2>Notify members</h2></div><Send/></div><input placeholder="Announcement title"value={noticeTitle}onChange={e=>setNoticeTitle(e.target.value)}/><textarea placeholder="Message for members"rows={6}value={noticeMessage}onChange={e=>setNoticeMessage(e.target.value)}/><button className="chef-primary chef-wide"onClick={sendAnnouncement}disabled={busy}><Send size={16}/>{busy?"Sending…":"Send notification"}</button>{noticeStatus&&<div className="chef-status">{noticeStatus}</div>}</section></main>}
  <nav className="chef-nav">{[["today","Home"],["menu","Menu"],["allergies","Allergies"],["late","Late"],["notify","Notify"]].map(([k,l])=><button key={k}className={tab===k?"active":""}onClick={()=>setTab(k)}>{k==="allergies"&&conflicts.filter(x=>x.meal_date===today).length>0?<i>{conflicts.filter(x=>x.meal_date===today).length}</i>:null}<span>{l}</span></button>)}</nav>
 </div>
}
