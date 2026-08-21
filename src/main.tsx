import React, {
  useEffect,
  useState,
} from "react";

import ReactDOM from "react-dom/client";

import {
  supabase,
} from "./lib/supabase";

import "./index.css";

type Page =
  | "dashboard"
  | "menu"
  | "allergies"
  | "late"
  | "notifications";

function App() {
  const [
    user,
    setUser,
  ] = useState<any>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    page,
    setPage,
  ] =
    useState<Page>(
      "dashboard"
    );

  useEffect(() => {
    loadUser();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUser(
            session?.user ?? null
          );
        }
      );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function loadUser() {
    const {
      data,
    } =
      await supabase.auth.getUser();

    setUser(
      data.user ?? null
    );

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  if (loading) {
    return (
      <main>
        <h1>
          HouseEats
        </h1>

        <p>
          Loading...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <h1>
          HouseEats
        </h1>

        <p>
          Please sign in.
        </p>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>
          HouseEats
        </h1>

        <button
          onClick={signOut}
        >
          Sign out
        </button>
      </header>

      <nav>
        <button
          onClick={() =>
            setPage(
              "dashboard"
            )
          }
        >
          Dashboard
        </button>

        <button
          onClick={() =>
            setPage("menu")
          }
        >
          4-Week Menu
        </button>

        <button
          onClick={() =>
            setPage(
              "allergies"
            )
          }
        >
          Allergies
        </button>

        <button
          onClick={() =>
            setPage("late")
          }
        >
          Late Plate
        </button>

        <button
          onClick={() =>
            setPage(
              "notifications"
            )
          }
        >
          Notifications
        </button>
      </nav>

      {page ===
        "dashboard" && (
        <section>
          <h2>
            Dashboard
          </h2>

          <p>
            Welcome to
            HouseEats.
          </p>
        </section>
      )}

      {page === "menu" && (
        <section>
          <h2>
            4-Week Menu
          </h2>

          <p>
            Your four-week
            menu will appear
            here.
          </p>
        </section>
      )}

      {page ===
        "allergies" && (
        <section>
          <h2>
            Allergy & Dietary
            Profile
          </h2>

          <p>
            Manage allergies
            and dietary
            restrictions.
          </p>
        </section>
      )}

      {page === "late" && (
        <section>
          <h2>
            Late Plate
          </h2>

          <p>
            Request a meal
            to be held for
            you.
          </p>
        </section>
      )}

      {page ===
        "notifications" && (
        <section>
          <h2>
            Notifications
          </h2>

          <p>
            Your HouseEats
            notifications will
            appear here.
          </p>
        </section>
      )}
    </main>
  );
}

ReactDOM.createRoot(
  document.getElementById(
    "root"
  )!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
