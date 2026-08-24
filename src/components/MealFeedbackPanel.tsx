import React,{useEffect,useMemo,useState}from"react";
import{supabase}from"../lib/supabase";

type Meal={id:string;meal_date:string;meal_type:string;name:string};
type Review={id:string;meal_id:string;user_id:string;rating:number;comment:string|null;created_at:string};

auto const stars=(n:number)=>"★★★★★".slice(0,Math.max(0,Math.min(5,n)));

export default function MealFeedbackPanel({user,role}:{user:any;role:string}){
 const[open,setOpen]=useState(false),[meals,setMeals]=useState<Meal[]>([]),[reviews,setReviews]=useState<Review[]>([]),[rsvps,setRsvps]=useState<string[]>([]),[selected,setSelected]=useState(""),[rating,setRating]=useState(0),[comment,setComment]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const isChef=role==="chef"||role==="admin"||role==="moderator";
 async function load(){
  const today=new Date();today.setHours(0,0,0,0);const todayIso=today.toISOString().slice(0,10);
  if(isChef){
   const[m,r]=await Promise.all([supabase.from("meals").select("id,meal_date,meal_type,name").lt("meal_date",todayIso).order("meal_date",{ascending:false}).limit(100),supabase.from("meal_reviews").select("id,meal_id,user_id,rating,comment,created_at").order("created_at",{ascending:false}).limit(500)]);setMeals(m.data||[]);setReviews(r.data||[]);
  }else{
   const[m,r,a]=await Promise.all([supabase.from("meals").select("id,meal_date,meal_type,name").lt("meal_date",todayIso).order("meal_date",{ascending:false}).limit(30),supabase.from("meal_reviews").select("id,meal_id,user_id,rating,comment,created_at").eq("user_id",user.id),supabase.from("rsvps").select("meal_id").eq("user_id",user.id).eq("attending",true)]);setMeals(m.data||[]);setReviews(r.data||[]);setRsvps((a.data||[]).map((x:any)=>x.meal_id));
  }
 }
 useEffect(()=>{if(open)void load()},[open,isChef,user.id]);
 const reviewByMeal=useMemo(()=>new Map(reviews.map(r=>[r.meal_id,r])),[reviews]);
 const eligible=meals.filter(m=>rsvps.includes(m.id)&&!reviewByMeal.has(m.id));
 const avg=reviews.length?reviews.reduce((s,r)=>s+r.rating,0)/reviews.length:0;
 async function submit(){if(!selected||rating<1)return;setBusy(true);setMessage("");const{data,error}=await supabase.from("meal_reviews").upsert({meal_id:selected,user_id:user.id,rating,comment:comment.trim()||null,updated_at:new Date().toISOString()},{onConflict:"meal_id,user_id"}).select().single();if(error)setMessage(error.message);else{setReviews(x=>[data,...x.filter(r=>r.meal_id!==selected||r.user_id!==user.id)]);setSelected("");setRating(0);setComment("");setMessage("Thanks for the feedback!")}setBusy(false)}
 return <>
  <button onClick={()=>setOpen(true)} style={{position:"fixed",right:16,bottom:76,zIndex:30,border:0,borderRadius:999,padding:"11px 15px",background:"#7a1717",color:"#fff",fontWeight:800,boxShadow:"0 8px 24px rgba(0,0,0,.18)"}}>{isChef?`★ ${avg?avg.toFixed(1):"—"}`:"★ Rate a meal"}</button>
  {open&&<div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:40,background:"rgba(0,0,0,.45)",display:"grid",alignItems:"end"}} onClick={()=>setOpen(false)}>
   <section onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"24px 24px 0 0",maxHeight:"82vh",overflow:"auto",padding:22}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><span style={{fontSize:11,fontWeight:800,letterSpacing:1,color:"#806f67"}}>{isChef?"KITCHEN FEEDBACK":"MEAL FEEDBACK"}</span><h2 style={{margin:"4px 0 0"}}>{isChef?"Member feedback":"How was your meal?"}</h2></div><button onClick={()=>setOpen(false)} aria-label="Close" style={{border:0,background:"#f3efec",borderRadius:99,width:36,height:36}}>×</button></div>
    {isChef?<><div style={{marginTop:18,padding:18,borderRadius:18,background:"#f7f3ef",textAlign:"center"}}><div style={{fontSize:28,letterSpacing:2}}>{stars(Math.round(avg))||"☆☆☆☆☆"}</div><strong style={{fontSize:28}}>{avg?avg.toFixed(1):"—"}</strong><div style={{color:"#806f67"}}>{reviews.length} rating{reviews.length===1?"":"s"}</div></div><div style={{marginTop:18}}>{reviews.length?reviews.map(r=>{const m=meals.find(x=>x.id===r.meal_id);return <article key={r.id} style={{padding:"15px 0",borderBottom:"1px solid #eee"}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong>{m?.name||"Meal"}</strong><span style={{letterSpacing:1}}>{stars(r.rating)}</span></div><small style={{color:"#806f67"}}>{m?.meal_date||""} · {m?.meal_type||""}</small>{r.comment&&<p style={{margin:"8px 0 0"}}>“{r.comment}”</p>}</article>}) : <p style={{color:"#806f67"}}>No member feedback yet.</p>}</div></>:<><p style={{color:"#806f67"}}>Rate meals you've RSVP'd for after service. Your comments are shared with the kitchen without your name.</p>{eligible.length?<div style={{display:"grid",gap:12}}>{eligible.slice(0,8).map(m=><button key={m.id} onClick={()=>setSelected(m.id)} style={{textAlign:"left",border:"1px solid #e6dfda",background:selected===m.id?"#f7ece9":"#fff",borderRadius:16,padding:15}}><strong>{m.name}</strong><div style={{fontSize:12,color:"#806f67",marginTop:4}}>{m.meal_date} · {m.meal_type}</div></button>)}</div>:<div style={{padding:16,background:"#f7f3ef",borderRadius:16,color:"#806f67"}}>You're all caught up. After you eat a meal, you'll be able to rate it here.</div>}{selected&&<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid #eee"}}><strong>Rating</strong><div style={{display:"flex",gap:5,margin:"10px 0"}}>{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} aria-label={`${n} stars`} style={{border:0,background:"transparent",fontSize:28,padding:2,opacity:n<=rating?1:.25}}>★</button>)}</div><textarea value={comment}onChange={e=>setComment(e.target.value)}placeholder="Tell the kitchen what you thought…"rows={4}style={{width:"100%",boxSizing:"border-box",border:"1px solid #ddd",borderRadius:14,padding:12}}/><button onClick={submit} disabled={busy||rating<1} style={{width:"100%",marginTop:10,border:0,borderRadius:14,padding:13,background:"#7a1717",color:"white",fontWeight:800}}>{busy?"Submitting…":"Submit review"}</button></div>}{message&&<p role="status" style={{color:"#806f67"}}>{message}</p>}</>}
   </section>
  </div>}
 </>
}
