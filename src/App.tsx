import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import RoleRouter from "./roleRouter";

type Profile = { id:string; full_name:string|null; email:string|null; role:"member"|"chef"|"moderator"|"admin"|string };

function Login({onSignedIn}:{onSignedIn:()=>void}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setError(error.message);else onSignedIn();setBusy(false)}
 return <main className="loginPage"><form className="loginCard" onSubmit={submit}><div className="brandMark">🍽️</div><h1>HouseEats</h1><p>Sign in to your meal workspace.</p>{error&&<div className="error">{error}</div>}<label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary" disabled={busy}>{busy?"Signing in…":"Sign in"}</button></form></main>
}
function Loading(){return <main className="loginPage"><div className="loadingCard"><div className="brandMark">🍽️</div><h1>HouseEats</h1><p>Loading your workspace…</p></div></main>}
function ProfileError({message,onSignOut}:{message:string;onSignOut:()=>void}){return <main className="loginPage"><div className="loginCard"><div className="brandMark">⚠️</div><h1>Profile unavailable</h1><p>We signed you in, but HouseEats could not load your member profile.</p><div className="error">{message}</div><button className="primary" onClick={onSignOut}>Sign out</button></div></main>}

export default function App(){
 const [user,setUser]=useState<any>(null),[profile,setProfile]=useState<Profile|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function loadSessionUser(currentUser?:any){
  const activeUser=currentUser??(await supabase.auth.getUser()).data.user;
  if(!activeUser){setUser(null);setProfile(null);setError("");setLoading(false);return}
  setUser(activeUser);setLoading(true);
  const {data,error:profileError}=await supabase.from("profiles").select("id,full_name,email,role").eq("id",activeUser.id).maybeSingle();
  if(profileError){setError(profileError.message);setProfile(null)} else if(!data){setError("No profile exists for this account. An administrator may need to create or activate your profile.");setProfile(null)} else {setError("");setProfile(data as Profile)}
  setLoading(false);
 }
 useEffect(()=>{let mounted=true;loadSessionUser();const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(!mounted)return;window.setTimeout(()=>{if(mounted)void loadSessionUser(session?.user??null)},0)});return()=>{mounted=false;auth.subscription.unsubscribe()}},[]);
 async function signOut(){await supabase.auth.signOut();setUser(null);setProfile(null);setError("")}
 if(loading)return <Loading/>;
 if(!user)return <Login onSignedIn={()=>void loadSessionUser()}/>;
 if(error||!profile)return <ProfileError message={error} onSignOut={signOut}/>;
 return <RoleRouter role={profile.role} user={user} profile={profile}/>;
}
