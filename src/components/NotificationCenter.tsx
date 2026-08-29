import React from "react";

export type HouseNotification={id:string;type:string;title:string;message:string;read:boolean;created_at:string};

type Props={notifications:HouseNotification[];onRead:(id:string)=>void;onReadAll:()=>void};

export default function NotificationCenter({notifications,onRead,onReadAll}:Props){
 const todayKey=new Date().toLocaleDateString();
 const todayNotifications=notifications.filter(n=>new Date(n.created_at).toLocaleDateString()===todayKey);
 const unread=todayNotifications.filter(n=>!n.read).length;
 return <section className="panel notificationCenter">
  <div className="heading"><div><h2>Alerts</h2><p>{unread} unread today</p></div>{unread>0&&<button onClick={onReadAll}>Mark all read</button>}</div>
  {todayNotifications.length===0?<div className="message">You're all caught up for today.</div>:<div className="notificationList">
   {todayNotifications.map(n=><article key={n.id} className={n.read?"notification read":"notification"} role={n.read?undefined:"button"} tabIndex={n.read?undefined:0} aria-label={n.read?undefined:`${n.title} — mark as read`} onClick={()=>!n.read&&onRead(n.id)} onKeyDown={e=>{if(!n.read&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onRead(n.id)}}}>
    <div><b>{n.title}</b><small>{new Date(n.created_at).toLocaleString()}</small></div>
    <p>{n.message}</p>{!n.read&&<span>NEW</span>}
   </article>)}
  </div>}
 </section>;
}
