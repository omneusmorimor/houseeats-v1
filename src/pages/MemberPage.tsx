import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import NotificationCenter, { HouseNotification } from "../components/NotificationCenter";
import { addDays, memberWindow, toISODate } from "../lib/calendar";

const allergens = ["Milk", "Eggs", "Wheat", "Soy", "Peanuts", "Tree Nuts", "Fish", "Shellfish", "Sesame"];
type Props = { user: any; profile: any };
type Meal = { id: string; meal_date: string; meal_type: string; name: string; description: string; allergens: string[] };
type Tab = "home" | "menu" | "allergies" | "late" | "notifications" | "profile";

export default function MemberPage({ user, profile }: Props) {
  const [tab, setTab] = useState<Tab>("home");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [myAllergies, setMyAllergies] = useState<string[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [late, setLate] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<HouseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [calendarNow, setCalendarNow] = useState(() => new Date());
  const { start: rangeStart } = memberWindow(calendarNow);
  const rangeEnd = addDays(rangeStart, 13);

  async function load() {
    setLoading(true);
    setError("");
    const { data: menu } = await supabase.from("menus").select("id").eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (menu) {
      const { data, error: e } = await supabase.from("meals").select("id,meal_date,meal_type,name,description,allergens").eq("menu_id", menu.id).gte("meal_date", toISODate(rangeStart)).lte("meal_date", toISODate(rangeEnd)).order("meal_date").order("meal_type");
      if (e) setError(e.message);
      setMeals(data || []);
    } else setMeals([]);

    const [a, r, l, n] = await Promise.all([
      supabase.from("member_allergies").select("allergen").eq("user_id", user.id),
      supabase.from("rsvps").select("meal_id,attending").eq("user_id", user.id),
      supabase.from("late_plates").select("meal_id").eq("user_id", user.id).neq("status", "cancelled"),
      supabase.from("notifications").select("id,type,title,message,read,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
    ]);
    setMyAllergies((a.data || []).map((x: any) => x.allergen));
    setRsvps(Object.fromEntries((r.data || []).map((x: any) => [x.meal_id, x.attending])));
    setLate((l.data || []).map((x: any) => x.meal_id));
    setNotifications((n.data || []) as HouseNotification[]);
    const firstError = [a.error, r.error, l.error, n.error].find(Boolean);
    if (firstError) setError(firstError.message);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase.channel(`member-notifications-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => load()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user.id, rangeStart.toISOString(), rangeEnd.toISOString()]);

  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(23, 59, 59, 999);
    const daysUntilSunday = (7 - now.getDay()) % 7;
    next.setDate(now.getDate() + daysUntilSunday);
    if (next <= now) next.setDate(next.getDate() + 7);
    const timer = window.setTimeout(() => setCalendarNow(new Date()), next.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [calendarNow]);

  async function toggleRsvp(meal_id: string) {
    const attending = !rsvps[meal_id];
    const { error: e } = await supabase.from("rsvps").upsert({ user_id: user.id, meal_id, attending, updated_at: new Date().toISOString() }, { onConflict: "user_id,meal_id" });
    if (!e) setRsvps(x => ({ ...x, [meal_id]: attending })); else setError(e.message);
  }

  async function toggleAllergy(a: string) {
    if (myAllergies.includes(a)) {
      const { error: e } = await supabase.from("member_allergies").delete().eq("user_id", user.id).eq("allergen", a);
      if (!e) setMyAllergies(x => x.filter(v => v !== a)); else setError(e.message);
    } else {
      const { error: e } = await supabase.from("member_allergies").insert({ user_id: user.id, allergen: a });
      if (!e) setMyAllergies(x => [...x, a]); else setError(e.message);
    }
  }

  async function requestLate(meal_id: string) {
    if (late.includes(meal_id)) return;
    const { error: e } = await supabase.from("late_plates").insert({ user_id: user.id, meal_id, status: "requested" });
    if (!e) setLate(x => [...x, meal_id]); else setError(e.message);
  }

  async function read(id: string) {
    const { error: e } = await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    if (!e) setNotifications(x => x.map(n => n.id === id ? { ...n, read: true } : n));
  }
  async function readAll() {
    const { error: e } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (!e) setNotifications(x => x.map(n => ({ ...n, read: true })));
  }
  async function signOut() { await supabase.auth.signOut(); }

  const unread = notifications.filter(n => !n.read).length;
  const today = toISODate(new Date());
  const todays = meals.filter(m => m.meal_date === today);
  const upcoming = meals.filter(m => m.meal_date >= today);
  const nextMeal = upcoming[0];
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(rangeStart, i)), [rangeStart]);

  const mealCard = (m: Meal, featured = false) => {
    const hasMemberAllergy = (m.allergens || []).some(a => myAllergies.includes(a));
    return <article className={featured ? "todayMeal featuredMeal" : "memberCalendarMeal"} key={m.id}>
      <div className="todayMealTop">
        <div className="memberCalendarMealInfo">
          <small className="mealBadge">{m.meal_type}</small>
          <h3>{m.name}</h3>
          {m.description && <p>{m.description}</p>}
          {m.allergens?.length > 0 && <small className={hasMemberAllergy ? "warningText" : ""}>⚠ {m.allergens.join(", ")}</small>}
          {hasMemberAllergy && <small className="warningText">⚠ Contains an allergy you selected</small>}
        </div>
      </div>
      <div className="mealActions">
        <button onClick={() => toggleRsvp(m.id)}>{rsvps[m.id] ? "✓ Going" : "RSVP"}</button>
        <button onClick={() => requestLate(m.id)} disabled={late.includes(m.id)}>{late.includes(m.id) ? "Late Plate Requested" : "Late Plate"}</button>
      </div>
    </article>;
  };

  const go = (next: Tab) => setTab(next);

  return <section className="roleWorkspace memberWorkspace">
    <header className="roleHero">
      <span>HOUSEEATS • MEMBER</span>
      <h1>Welcome, {profile?.full_name || "Member"}</h1>
      <p>Your meals, attendance, dietary alerts and late plates — all in one place.</p>
      <button onClick={signOut}>Sign out</button>
    </header>

    <nav className="workspaceNav">
      {(["home", "menu", "allergies", "late", "notifications", "profile"] as Tab[]).map(x => <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>{x === "home" ? "🏠 Home" : x === "menu" ? "📅 Meals" : x === "allergies" ? "⚠️ Allergies" : x === "late" ? "🥡 Late Plate" : x === "notifications" ? `🔔 Alerts${unread ? ` (${unread})` : ""}` : "👤 Profile"}</button>)}
    </nav>

    {error && <div className="error">{error}</div>}
    {loading ? <div className="message">Loading HouseEats…</div> : <>
      {tab === "home" && <>
        <section className="memberHomeHero">
          <span className="eyebrow">{todays.length ? "TODAY AT THE HOUSE" : "UP NEXT"}</span>
          <h2>{nextMeal ? nextMeal.name : "No meal posted yet"}</h2>
          <p>{nextMeal ? `${nextMeal.meal_date === today ? "Today" : nextMeal.meal_date} • ${nextMeal.meal_type}` : "Check back when the kitchen posts the menu."}</p>
          <div className="memberQuickActions">
            <button onClick={() => go("menu")}>📅 View meals</button>
            <button onClick={() => go("allergies")}>⚠️ My allergies</button>
            <button onClick={() => go("late")}>🥡 Late plate</button>
          </div>
        </section>

        <section className="panel">
          <div className="heading"><div><h2>{todays.length ? "Today's Meals" : "Next Meal"}</h2><p>{todays.length ? "Make your dinner plans." : "Your next scheduled house meal."}</p></div><button onClick={() => go("menu")}>Full menu →</button></div>
          {todays.length ? todays.map(m => mealCard(m, true)) : nextMeal ? mealCard(nextMeal, true) : <div className="message">No meals posted yet.</div>}
        </section>

        {myAllergies.length > 0 && <section className="panel">
          <div className="heading"><div><h2>Dietary alerts</h2><p>Meals below may contain something you selected.</p></div><button onClick={() => go("allergies")}>Edit</button></div>
          <p className="warningText">Your alerts: {myAllergies.join(", ")}</p>
        </section>}

        <section className="panel">
          <div className="heading"><div><h2>Coming up</h2><p>Your next few meals.</p></div></div>
          {upcoming.slice(0, 4).map(m => mealCard(m))}
        </section>
      </>}

      {tab === "menu" && <section className="panel memberSimpleCalendar"><div className="memberCalendarToolbar"><div><h2>Meals</h2><p>This week + next week</p></div></div><div className="memberCalendarGrid">{days.map(d => { const ds = toISODate(d), dayMeals = meals.filter(m => m.meal_date === ds), isToday = ds === today; return <section className={`memberCalendarDay ${isToday ? "today" : ""}`} key={ds}><header><b>{d.toLocaleDateString(undefined, { weekday: "short" })}</b><span>{d.getDate()}</span></header><div className="memberCalendarMeals">{dayMeals.length ? dayMeals.map(m => mealCard(m)) : <small>No meals</small>}</div></section>; })}</div></section>}

      {tab === "allergies" && <section className="panel"><div className="heading"><div><h2>My allergies</h2><p>Select everything the kitchen needs to know about.</p></div></div><div className="allergyGrid">{allergens.map(a => <label key={a}><input type="checkbox" checked={myAllergies.includes(a)} onChange={() => toggleAllergy(a)} /> {a}</label>)}</div><p><b>Selected:</b> {myAllergies.join(", ") || "None"}</p></section>}

      {tab === "late" && <section className="panel"><div className="heading"><div><h2>Late Plate</h2><p>Request a plate when you'll miss the normal meal time.</p></div></div>{late.length ? <div className="roleCards">{late.map(id => { const m = meals.find(x => x.id === id); return <div className="roleCard" key={id}><b>{m?.name || "Meal"}</b><small>{m?.meal_date} · {m?.meal_type}</small><span>Requested</span></div>; })}</div> : <div className="message">No active late-plate requests. Request one from Meals.</div>}</section>}

      {tab === "notifications" && <NotificationCenter notifications={notifications} onRead={read} onReadAll={readAll} />}

      {tab === "profile" && <section className="panel"><div className="heading"><div><h2>Profile</h2><p>Your HouseEats account.</p></div></div><p><b>Name:</b> {profile?.full_name || "—"}</p><p><b>Email:</b> {profile?.email || user.email}</p><p><b>Role:</b> Member</p><button onClick={() => go("allergies")}>Manage allergies →</button></section>}
    </>}
  </section>;
}
