import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { supabase } from "./lib/supabase";

type Page = "dashboard" | "menu" | "allergies" | "late" | "notifications" | "chef";

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>("dashboard");

  useEffect(() => {
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) return <main><h1>HouseEats</h1><p>Loading...</p></main>;
  if (!user) return <main><h1>HouseEats</h1><p>Please sign in.</p></main>;

  return (
    <main>
      <header><h1>HouseEats</h1><button onClick={signOut}>Sign out</button></header>
      <nav>
        <button onClick={() => setPage("dashboard")}>Dashboard</button>
        <button onClick={() => setPage("menu")}>4-Week Menu</button>
        <button onClick={() => setPage("allergies")}>Allergies</button>
        <button onClick={() => setPage("late")}>Late Plate</button>
        <button onClick={() => setPage("notifications")}>Notifications</button>
        <button onClick={() => setPage("chef")}>Chef / Mod</button>
      </nav>
      {page === "dashboard" && <section><h2>Dashboard</h2><p>HouseEats meal management.</p></section>}
      {page === "menu" && <section><h2>4-Week Menu</h2><p>Four weeks of meals, RSVP and allergy warnings coming next.</p></section>}
      {page === "allergies" && <section><h2>Allergy & Dietary Profile</h2><p>Manage member allergies and dietary restrictions.</p></section>}
      {page === "late" && <section><h2>Late Plate</h2><p>Request a meal to be held.</p></section>}
      {page === "notifications" && <section><h2>Notifications</h2><p>Menu and meal notifications.</p></section>}
      {page === "chef" && <section><h2>Chef / Moderator</h2><p>Chef menu editing and print tools.</p><button onClick={() => window.print()}>Print</button></section>}
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
