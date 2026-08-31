import React, { useEffect, useMemo, useState } from "react";
import { Bell, ChevronRight, Clock3, Utensils, UserRound, TriangleAlert, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../member-v2.css";

type Tab = "home" | "menu" | "late" | "alerts" | "profile";
type Meal = { id: string; meal_date: string; meal_type: string; name: string; description?: string | null; allergens?: string[] | null };
type Notice = { id: string; title: string; message: string; read: boolean; created_at: string };

const allergens = ["Milk", "Eggs", "Wheat", "Soy", "Peanuts", "Tree Nuts", "Fish", "Shellfish", "Sesame"];
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const dateLabel = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function MemberPageV2({ user, profile }: { user: any; profile: any }) {
  const [tab, setTab] = useState<Tab>("home");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [savedAllergies, setSavedAllergies] = useState<string[]>([]);
  const [late, setLate] = useState<string[]>([]);
  const [notes, setNotes] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const today = todayISO();
  const first = (profile?.full_name || "Member").trim().split(/\s+/)[0] || "Member";
  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening";

  async function load() {
    setLoading(true); setError("");
    try {
      const end = new Date(`${today}T12:00:00`); end.setDate(end.getDate() + 13);
      const menu = await supabase.from("menus").select("id").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const [a, l, n] = await Promise.all([
        supabase.from("member_allergies").select("allergen").eq("user_id", user.id),
        supabase.from("late_plates").select("meal_id").eq("user_id", user.id).neq("status", "cancelled"),
        supabase.from("notifications").select("id,title,message,read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      if (menu.error) throw menu.error;
      if (menu.data) {
        const m = await supabase.from("meals").select("id,meal_date,meal_type,name,description,allergens").eq("menu_id", menu.data.id).gte("meal_date", today).lte("meal_date", end.toISOString().slice(0, 10)).order("meal_date").order("meal_type");
        if (m.error) throw m.error;
        setMeals((m.data || []) as Meal[]);
      } else setMeals([]);
      if (a.error) throw a.error; if (l.error) throw l.error; if (n.error) throw n.error;
      setSavedAllergies((a.data || []).map((x: any) => x.allergen));
      setLate((l.data || []).map((x: any) => x.meal_id));
      setNotes((n.data || []) as Notice[]);
    } catch (e: any) { setError(e?.message || "We couldn't load your HouseEats data."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [user.id]);

  async function toggleLate(meal: Meal) {
    const active = late.includes(meal.id);
    const r = active
      ? await supabase.from("late_plates").update({ status: "cancelled" }).eq("user_id", user.id).eq("meal_id", meal.id).neq("status", "cancelled")
      : await supabase.from("late_plates").insert({ user_id: user.id, meal_id: meal.id, status: "requested" });
    if (r.error) setError(r.error.message); else setLate(x => active ? x.filter(id => id !== meal.id) : [...x, meal.id]);
  }
  async function toggleAllergy(name: string) {
    const active = savedAllergies.includes(name);
    const r = active ? await supabase.from("member_allergies").delete().eq("user_id", user.id).eq("allergen", name) : await supabase.from("member_allergies").insert({ user_id: user.id, allergen: name });
    if (r.error) setError(r.error.message); else setSavedAllergies(x => active ? x.filter(a => a !== name) : [...x, name]);
  }
  async function markRead(id: string) {
    const r = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    if (!r.error) setNotes(x => x.map(n => n.id === id ? { ...n, read: true } : n));
  }
  async function markAllRead() {
    const r = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (!r.error) setNotes(x => x.map(n => ({ ...n, read: true })));
  }

  const upcoming = useMemo(() => meals.filter(m => m.meal_date >= today), [meals, today]);
  const tonight = upcoming[0];
  const unread = notes.filter(n => !n.read).length;
  const go = (next: Tab) => setTab(next);

  if (loading) return <main className="v2-app"><div className="v2-loading">HouseEats</div></main>;

  return <main className="v2-app">
    <header className="v2-topbar">
      <button className="v2-brand" onClick={() => go("home")}><span>HOUSEEATS</span><small>{greeting}, {first}</small></button>
      <button className="v2-alert-button" onClick={() => go("alerts")} aria-label="Alerts"><Bell />{unread > 0 && <b>{unread}</b>}</button>
    </header>
    {error && <div className="v2-error"><TriangleAlert /><span>{error}</span><button onClick={() => setError("")}>Dismiss</button></div>}

    {tab === "home" && <section className="v2-screen">
      <div className="v2-intro"><span>TONIGHT AT THE HOUSE</span><h1>{tonight?.name || "The kitchen is getting ready."}</h1><p>{tonight ? `${dateLabel(tonight.meal_date)} · ${tonight.meal_type}` : "Check back when the kitchen posts the next meal."}</p></div>
      {tonight && <div className="v2-feature"><div><span>DINNER</span><h2>{tonight.name}</h2><p>{tonight.description || "A meal prepared for the house."}</p></div><button onClick={() => go("menu")}>View menu <ChevronRight /></button></div>}
      <div className="v2-rule" />
      <div className="v2-section-head"><span>UP NEXT</span><button onClick={() => go("menu")}>Full menu <ChevronRight /></button></div>
      <div className="v2-meals">{upcoming.slice(0, 5).map(m => <button key={m.id} className="v2-meal" onClick={() => go("menu")}><time>{dateLabel(m.meal_date)}</time><strong>{m.name}</strong><small>{m.meal_type}</small></button>)}</div>
      <div className="v2-actions"><button onClick={() => go("late")}><Clock3 /><span><strong>Late plate</strong><small>{late.length ? "Manage your requests" : "Let the kitchen know you're running late"}</small></span><ChevronRight /></button><button onClick={() => go("profile")}><TriangleAlert /><span><strong>Dietary information</strong><small>{savedAllergies.length ? `${savedAllergies.length} alerts saved` : "Keep the kitchen informed"}</small></span><ChevronRight /></button></div>
    </section>}

    {tab === "menu" && <section className="v2-screen"><PageTitle eyebrow="THE HOUSE MENU" title="What's cooking" back={() => go("home")} /><div className="v2-menu">{upcoming.map(m => <article key={m.id}><div className="v2-menu-meta"><time>{dateLabel(m.meal_date)}</time><span>{m.meal_type}</span></div><h2>{m.name}</h2>{m.description && <p>{m.description}</p>}{(m.allergens || []).some(a => savedAllergies.includes(a)) && <div className="v2-warning"><TriangleAlert /> Contains an ingredient in your dietary alerts.</div>}<button onClick={() => toggleLate(m)} className={late.includes(m.id) ? "requested" : ""}>{late.includes(m.id) ? "Late plate requested" : "Request a late plate"}</button></article>)}</div></section>}

    {tab === "late" && <section className="v2-screen"><PageTitle eyebrow="MEAL SERVICE" title="Late plate" subtitle="Running late? Let the kitchen know." back={() => go("home")} /><div className="v2-service">{upcoming.map(m => <div key={m.id}><div><time>{dateLabel(m.meal_date)} · {m.meal_type}</time><strong>{m.name}</strong></div><button className={late.includes(m.id) ? "requested" : ""} onClick={() => toggleLate(m)}>{late.includes(m.id) ? "Requested" : "Request"}</button></div>)}</div></section>}

    {tab === "alerts" && <section className="v2-screen"><PageTitle eyebrow="HOUSE UPDATES" title="Alerts" subtitle="Important updates from the kitchen and chapter." back={() => go("home")} />{unread > 0 && <button className="v2-mark" onClick={markAllRead}>Mark all read</button>}<div className="v2-notices">{notes.length ? notes.map(n => <button key={n.id} className={n.read ? "v2-notice" : "v2-notice unread"} onClick={() => markRead(n.id)}><Bell /><div><strong>{n.title}</strong><p>{n.message}</p><time>{new Date(n.created_at).toLocaleDateString()}</time></div></button>) : <div className="v2-empty">You're all caught up.</div>}</div></section>}

    {tab === "profile" && <section className="v2-screen"><PageTitle eyebrow="YOUR ACCOUNT" title={profile?.full_name || "Member"} subtitle={user?.email || ""} back={() => go("home")} /><div className="v2-profile-block"><div><span>DIETARY INFORMATION</span><h2>What the kitchen should know</h2><p>Select anything you need the kitchen to avoid. This information is only used for meal service.</p></div><div className="v2-allergies">{allergens.map(a => <button key={a} className={savedAllergies.includes(a) ? "selected" : ""} onClick={() => toggleAllergy(a)}><span>{a}</span>{savedAllergies.includes(a) && "✓"}</button>)}</div></div></section>}

    <nav className="v2-nav"><NavItem active={tab === "home"} label="Home" icon={<span className="v2-home-dot" />} onClick={() => go("home")} /><NavItem active={tab === "menu"} label="Menu" icon={<Utensils />} onClick={() => go("menu")} /><NavItem active={tab === "late"} label="Late plate" icon={<Clock3 />} onClick={() => go("late")} /><NavItem active={tab === "alerts"} label="Alerts" icon={<Bell />} badge={unread} onClick={() => go("alerts")} /><NavItem active={tab === "profile"} label="Profile" icon={<UserRound />} onClick={() => go("profile")} /></nav>
  </main>;
}

function PageTitle({ eyebrow, title, subtitle, back }: { eyebrow: string; title: string; subtitle?: string; back: () => void }) {
  return <div className="v2-page-title"><button onClick={back}><ArrowLeft /> Back</button><span>{eyebrow}</span><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>;
}
function NavItem({ active, label, icon, badge, onClick }: { active: boolean; label: string; icon: React.ReactNode; badge?: number; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span>{badge ? <b>{badge}</b> : null}</button>;
}
