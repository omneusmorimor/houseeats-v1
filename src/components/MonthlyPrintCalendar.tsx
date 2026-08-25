import React from "react";
import { addDays, toISODate } from "../lib/calendar";

type Meal = { id:string; meal_date:string; meal_type:string; name:string; description?:string; allergens?:string[] };
type Props = { month:Date; meals:Meal[]; count:(id:string)=>number; late:any[] };

export default function MonthlyPrintCalendar({month,meals,count,late}:Props){
  const first=new Date(month.getFullYear(),month.getMonth(),1,12);
  const last=new Date(month.getFullYear(),month.getMonth()+1,0,12);
  const start=new Date(first); start.setDate(first.getDate()-first.getDay());
  const end=new Date(last); end.setDate(last.getDate()+(6-last.getDay()));
  const days=[]; for(let d=new Date(start);d<=end;d=addDays(d,1)) days.push(new Date(d));
  const mealFor=(d:Date)=>meals.filter(m=>m.meal_date===toISODate(d)).sort((a,b)=>a.meal_type.localeCompare(b.meal_type));
  return <div className="monthlyPrintDocument">
    <header className="monthlyPrintTitle"><div className="monthlyPrintBrand">HOUSEEATS</div><h1>{month.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h1><p>Kitchen Monthly Menu</p></header>
    <table className="monthlyPrintTable"><thead><tr>{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(d=><th key={d}>{d}</th>)}</tr></thead><tbody>
      {Array.from({length:6},(_,week)=><tr key={week}>{days.slice(week*7,week*7+7).map(d=>{const outside=d.getMonth()!==month.getMonth();return <td className={outside?"outside":""} key={toISODate(d)}><div className="monthlyPrintDate">{d.getDate()}</div><div className="monthlyPrintMeals">{mealFor(d).map(m=><div className="monthlyPrintMeal" key={m.id}><b className="monthlyPrintType">{m.meal_type}</b><strong>{m.name}</strong>{m.description&&<span>{m.description}</span>}{m.allergens?.length?<small>⚠ {m.allergens.join(", ")}</small>:null}<em>{count(m.id)} attending · {late.filter(l=>l.meal_id===m.id).length} late</em></div>)}</div></td>})}</tr>)}
    </tbody></table>
  </div>;
}
