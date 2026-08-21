import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import RoleRouter from "./roleRouter";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "member" | "chef" | "moderator" | "admin" | string;
};

function Loading() {
  return (
    <main className="loginPage">
      <div className="loadingCard">
        <div className="brandMark">🍽️</div>
        <h1>HouseEats</h1>
        <p>Loading your workspace…</p>
      </div>
    </main>
  );
}

function ProfileError({ message, onSignOut }: { message: string; onSignOut: () => void }) {
  return (
    <main className="loginPage">
      <div className="loginCard">
        <div className="brandMark">⚠️</div>
        <h1>Profile unavailable</h1>
        <p>We signed you in, but HouseEats could not load your member profile.</p>
        <div className="error">{message}</div>
        <button className="primary" onClick={onSignOut}>Sign out</button>
      </div>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSessionUser(currentUser?: any) {
    const activeUser = currentUser ?? (await supabase.auth.getUser()).data.user;

    if (!activeUser) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUser(activeUser);

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,full_name,email,role")
      .eq("id", activeUser.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setProfile(null);
    } else if (!data) {
      setError("No profile exists for this account. An administrator may need to create or activate your profile.");
      setProfile(null);
    } else {
      setError("");
      setProfile(data as Profile);
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    loadSessionUser();

    const { data: auth } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await loadSessionUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      auth.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  if (loading) return <Loading />;
  if (!user) return null;
  if (error || !profile) return <ProfileError message={error} onSignOut={signOut} />;

  return <RoleRouter role={profile.role} user={user} profile={profile} />;
}
