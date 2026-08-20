import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  UtensilsCrossed,
  CalendarCheck,
  ShieldAlert,
  Clock3,
  Bell,
  Menu as MenuIcon,
  Home,
  ChevronRight,
  Check,
  Plus,
  LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./styles.css";

type Role = "member" | "chef" | "admin";

type Profile = {
  id: string;
  chapter_id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

type RSVPStatus = "eating" | "not_eating";
type RSVPRecord = Record<string, RSVPStatus>;

const meals = [
  {
    id: "1",
    name: "Chicken Alfredo",
    description:
      "Grilled chicken, penne, Alfredo sauce, broccoli",
    day: "Today",
  },
  {
    id: "2",
    name: "Taco Bar",
    description:
      "Beef, chicken, tortillas, rice, beans and toppings",
    day: "Tomorrow",
  },
  {
    id: "3",
    name: "Breakfast for Dinner",
    description:
      "Eggs, sausage, hash browns, fruit and biscuits",
    day: "Friday",
  },
];

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] =
    useState<Role>("member");

  const [page, setPage] =
    useState("dashboard");

  const [rsvps, setRsvps] =
    useState<RSVPRecord>({});

  const [latePlate, setLatePlate] =
    useState(false);

  const [allergies, setAllergies] =
    useState<string[]>([]);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadUser() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      await loadProfile(session.user.id);
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );
      setLoading(false);
    }
  }

  async function loadProfile(userId: string) {
    try {
      const { data, error } =
        await supabase
          .from("profiles")
          .select(
            "id, chapter_id, full_name, role, created_at"
          )
          .eq("id", userId)
          .single();

      if (error) {
        console.error(
          "Profile error:",
          error
        );
        setProfile(null);
      } else {
        setProfile(data as Profile);
        setRole(data.role as Role);
      }
    } catch (error) {
      console.error(
        "Profile loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="login">
        <div className="loginbox">
          <h1>
            <UtensilsCrossed />
            HouseEats
          </h1>

          <p>Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Login
        onLogin={async () => {
          await loadUser();
        }}
      />
    );
  }

  const kitchen =
    role !== "member";

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
    setPage("dashboard");
  }

  return (
    <div className="app">
      <header>
        <b className="brand">
          <UtensilsCrossed />
          HouseEats
        </b>

        <div className="header-right">
          <span>
            {profile.full_name ||
              "Member"}
          </span>

          <button
            className="icon-button"
            onClick={logout}
            title="Sign out"
          >
            <LogOut />
          </button>
        </div>
      </header>

      <main>
        <div className="roles">
          {(
            ["member", "chef", "admin"] as Role[]
          ).map((r) => (
            <button
              key={r}
              className={
                role === r ? "on" : ""
              }
              onClick={() => {
                setRole(r);
                setPage("dashboard");
              }}
            >
              {r.charAt(0).toUpperCase() +
                r.slice(1)}
            </button>
          ))}
        </div>

        {page === "dashboard" && (
          <Dashboard
            kitchen={kitchen}
            rsvps={rsvps}
            late={latePlate}
            setPage={setPage}
          />
        )}

        {page === "menu" && (
          <Menu
            kitchen={kitchen}
            rsvps={rsvps}
            setRsvps={setRsvps}
          />
        )}

        {page === "rsvp" && (
          <RSVP
            rsvps={rsvps}
            setRsvps={setRsvps}
          />
        )}

        {page === "allergy" && (
          <Allergy
            allergies={allergies}
            setAllergies={setAllergies}
          />
        )}

        {page === "late" && (
          <Late
            late={latePlate}
            setLate={setLatePlate}
          />
        )}

        {page === "notifications" && (
          <Notifications />
        )}

        {page === "headcount" && (
          <Headcount rsvps={rsvps} />
        )}

        {page === "allergies" && (
          <Alerts
            allergies={allergies}
          />
        )}
      </main>

      <nav>
        {(kitchen
          ? [
              ["dashboard", "Kitchen"],
              ["headcount", "Headcount"],
              ["allergies", "Allergies"],
              ["late", "Late Plates"],
              ["menu", "Menu"],
            ]
          : [
              ["dashboard", "Home"],
              ["menu", "Menu"],
              ["rsvp", "RSVP"],
              ["allergy", "Allergy"],
              ["late", "Late"],
              [
                "notifications",
                "Updates",
              ],
            ]
        ).map(([p, label]) => (
          <button
            key={p}
            className={
              page === p ? "sel" : ""
            }
            onClick={() =>
              setPage(p)
            }
          >
            {p === "dashboard" && (
              <Home />
            )}

            {p === "menu" && (
              <MenuIcon />
            )}

            {(p === "rsvp" ||
              p === "headcount") && (
              <CalendarCheck />
            )}

            {(p === "allergy" ||
              p === "allergies") && (
              <ShieldAlert />
            )}

            {p === "late" && (
              <Clock3 />
            )}

            {p === "notifications" && (
              <Bell />
            )}

            <small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Login({
  onLogin,
}: {
  onLogin: () => Promise<void>;
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  async function signIn() {
    setLoading(true);
    setError("");
    setMessage("");

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    await onLogin();
    setLoading(false);
  }

  async function signUp() {
    setLoading(true);
    setError("");
    setMessage("");

    if (!email || !password) {
      setError(
        "Enter an email and password."
      );
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      setLoading(false);
      return;
    }

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (error) {
      setError(error.message);
    } else {
      setMessage(
        "Account created. You can now sign in."
      );
    }

    setLoading(false);
  }

  return (
    <div className="login">
      <div className="loginbox">
        <h1>
          <UtensilsCrossed />
          HouseEats
        </h1>

        <p>
          Your chapter's meal hub.
        </p>

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) =>
            setPassword(
              event.target.value
            )
          }
        />

        {error && (
          <p className="error">
            {error}
          </p>
        )}

        {message && (
          <p className="green">
            {message}
          </p>
        )}

        <button
          className="primary"
          onClick={signIn}
          disabled={loading}
        >
          {loading
            ? "Signing in..."
            : "Sign in"}
        </button>

        <button
          className="secondary"
          onClick={signUp}
          disabled={loading}
        >
          Create account
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  kitchen,
  rsvps,
  late,
  setPage,
}: {
  kitchen: boolean;
  rsvps: RSVPRecord;
  late: boolean;
  setPage: (page: string) => void;
}) {
  if (kitchen) {
    const expected =
      Object.values(rsvps).filter(
        (value) =>
          value === "eating"
      ).length;

    return (
      <>
        <p className="eyebrow">
          KITCHEN
        </p>

        <h1>
          Kitchen Dashboard
        </h1>

        <div className="stats">
          <Card>
            <b>{expected}</b>
            <small>
              Expected tonight
            </small>
          </Card>

          <Card>
            <b>
              {late ? 1 : 0}
            </b>
            <small>
              Late plates
            </small>
          </Card>

          <Card>
            <b>0</b>
            <small>
              Allergy alerts
            </small>
          </Card>

          <Card>
            <b>3</b>
            <small>
              Menu items
            </small>
          </Card>
        </div>

        <Card>
          <h2>Tonight</h2>

          <p>
            Chicken Alfredo ·
            5:30 PM
          </p>

          <button
            className="primary"
            onClick={() =>
              setPage(
                "headcount"
              )
            }
          >
            Open headcount
            <ChevronRight />
          </button>
        </Card>
      </>
    );
  }

  return (
    <>
      <div className="hero">
        <p>
          TONIGHT'S DINNER
        </p>

        <h1>
          Chicken Alfredo
        </h1>

        <span>
          5:30 PM · RSVP by
          3:00 PM
        </span>
      </div>

      <h2>
        Quick actions
      </h2>

      <div className="actions">
        <Action
          title="RSVP"
          subtitle={
            rsvps["1"] ===
            "eating"
              ? "You're eating"
              : "Tell the kitchen"
          }
          icon={
            <CalendarCheck />
          }
          onClick={() =>
            setPage("rsvp")
          }
        />

        <Action
          title="Allergies"
          subtitle="Keep your profile current"
          icon={
            <ShieldAlert />
          }
          onClick={() =>
            setPage("allergy")
          }
        />

        <Action
          title="Late plate"
          subtitle={
            late
              ? "Requested"
              : "Need one later?"
          }
          icon={
            <Clock3 />
          }
          onClick={() =>
            setPage("late")
          }
        />

        <Action
          title="Full menu"
          subtitle="See upcoming meals"
          icon={
            <MenuIcon />
          }
          onClick={() =>
            setPage("menu")
          }
        />
      </div>
    </>
  );
}

function Action({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="card action"
      onClick={onClick}
    >
      {icon}

      <span>
        <b>{title}</b>
        <small>
          {subtitle}
        </small>
      </span>

      <ChevronRight />
    </button>
  );
}

function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      {children}
    </div>
  );
}

function Menu({
  kitchen,
  rsvps,
  setRsvps,
}: {
  kitchen: boolean;
  rsvps: RSVPRecord;
  setRsvps: React.Dispatch<
    React.SetStateAction<RSVPRecord>
  >;
}) {
  return (
    <>
      <div className="head">
        <div>
          <p className="eyebrow">
            MEALS
          </p>

          <h1>
            {kitchen
              ? "Menu Management"
              : "Menu"}
          </h1>
        </div>

        {kitchen && (
          <button className="primary">
            <Plus />
            Add meal
          </button>
        )}
      </div>

      {meals.map((meal) => (
        <Card key={meal.id}>
          <div className="meal">
            <div>
              <small>
                {meal.day}
              </small>

              <h2>
                {meal.name}
              </h2>

              <p>
                {meal.description}
              </p>

              <span>
                🍽 5:30 PM
              </span>
            </div>

            {!kitchen && (
              <button
                className={
                  rsvps[
                    meal.id
                  ] === "eating"
                    ? "success"
                    : "primary"
                }
                onClick={() =>
                  setRsvps(
                    (current) => ({
                      ...current,
                      [meal.id]:
                        current[
                          meal.id
                        ] === "eating"
                          ? "not_eating"
                          : "eating",
                    })
                  )
                }
              >
                {rsvps[
                  meal.id
                ] === "eating" ? (
                  <>
                    <Check />
                    Eating
                  </>
                ) : (
                  "RSVP"
                )}
              </button>
            )}
          </div>
        </Card>
      ))}
    </>
  );
}

function RSVP({
  rsvps,
  setRsvps,
}: {
  rsvps: RSVPRecord;
  setRsvps: React.Dispatch<
    React.SetStateAction<RSVPRecord>
  >;
}) {
  return (
    <>
      <p className="eyebrow">
        DINNER RSVP
      </p>

      <h1>
        Who's eating?
      </h1>

      <p className="muted">
        Your RSVP helps the
        kitchen prepare the
        right amount.
      </p>

      {meals
        .slice(0, 2)
        .map((meal) => (
          <Card key={meal.id}>
            <div className="head">
              <div>
                <h2>
                  {meal.name}
                </h2>

                <p>
                  {meal.day} ·
                  5:30 PM
                </p>
              </div>

              <div className="choice">
                <button
                  className={
                    rsvps[
                      meal.id
                    ] === "eating"
                      ? "on"
                      : ""
                  }
                  onClick={() =>
                    setRsvps(
                      (current) => ({
                        ...current,
                        [meal.id]:
                          "eating",
                      })
                    )
                  }
                >
                  Eating
                </button>

                <button
                  className={
                    rsvps[
                      meal.id
                    ] === "not_eating"
                      ? "on"
                      : ""
                  }
                  onClick={() =>
                    setRsvps(
                      (current) => ({
                        ...current,
                        [meal.id]:
                          "not_eating",
                      })
                    )
                  }
                >
                  Not eating
                </button>
              </div>
            </div>
          </Card>
        ))}
    </>
  );
}

function Allergy({
  allergies,
  setAllergies,
}: {
  allergies: string[];
  setAllergies: React.Dispatch<
    React.SetStateAction<string[]>
  >;
}) {
  const options = [
    "Peanuts",
    "Tree nuts",
    "Dairy",
    "Eggs",
    "Gluten",
    "Shellfish",
    "Fish",
    "Soy",
  ];

  const dietaryOptions = [
    "Vegetarian",
    "Vegan",
    "Halal",
    "Gluten-free",
  ];

  return (
    <>
      <p className="eyebrow">
        PRIVATE PROFILE
      </p>

      <h1>
        Allergy & dietary
        profile
      </h1>

      <p className="muted">
        Only authorized
        kitchen/admin users
        can see allergy details.
      </p>

      <Card>
        <h2>Allergies</h2>

        <div className="chips">
          {options.map(
            (option) => {
              const active =
                allergies.includes(
                  option
                );

              return (
                <button
                  key={option}
                  className={
                    active
                      ? "chip active"
                      : "chip"
                  }
                  onClick={() =>
                    setAllergies(
                      (current) =>
                        active
                          ? current.filter(
                              (
                                item
                              ) =>
                                item !==
                                option
                            )
                          : [
                              ...current,
                              option,
                            ]
                    )
                  }
                >
                  {active && (
                    <Check />
                  )}

                  {option}
                </button>
              );
            }
          )}
        </div>
      </Card>

      <Card>
        <h2>
          Dietary restrictions
        </h2>

        <div className="chips">
          {dietaryOptions.map(
            (option) => (
              <button
                key={option}
                className="chip"
              >
                {option}
              </button>
            )
          )}
        </div>
      </Card>
    </>
  );
}

function Late({
  late,
  setLate,
}: {
  late: boolean;
  setLate: React.Dispatch<
    React.SetStateAction<boolean>
  >;
}) {
  return (
    <>
      <p className="eyebrow">
        DINNER SERVICE
      </p>

      <h1>
        Late plate
      </h1>

      <Card>
        <h2>
          Running late?
        </h2>

        <p>
          Tell the kitchen to
          hold a plate for you.
        </p>

        <button
          className={
            late
              ? "success"
              : "primary"
          }
          onClick={() =>
            setLate(!late)
          }
        >
          {late ? (
            <>
              <Check />
              Late plate requested
            </>
          ) : (
            "Request a late plate"
          )}
        </button>

        {late && (
                   <p className="green">
            The kitchen has been
            notified.
          </p>
        )}
      </Card>
    </>
  );
}

function Notifications() {
  return (
    <>
      <p className="eyebrow">
        UPDATES
      </p>

      <h1>
        Notifications
      </h1>

      <Card>
        <b>
          Dinner RSVP reminder
        </b>

        <p>
          Don't forget to RSVP
          before dinner.
        </p>
      </Card>

      <Card>
        <b>
          Menu posted
        </b>

        <p>
          Your chapter's menu
          has been updated.
        </p>
      </Card>
    </>
  );
}

function Headcount({
  rsvps,
}: {
  rsvps: RSVPRecord;
}) {
  const count =
    Object.values(
      rsvps
    ).filter(
      (value) =>
        value === "eating"
    ).length;

  return (
    <>
      <p className="eyebrow">
        KITCHEN
      </p>

      <h1>
        Headcount
      </h1>

      <div className="big">
        {count}
      </div>

      <p className="center muted">
        confirmed RSVPs
      </p>
    </>
  );
}

function Alerts({
  allergies,
}: {
  allergies: string[];
}) {
  return (
    <>
      <p className="eyebrow">
        KITCHEN
      </p>

      <h1>
        Allergy Alerts
      </h1>

      <Card>
        {allergies.length > 0
          ? allergies.map(
              (allergy) => (
                <p key={allergy}>
                  ⚠️{" "}
                  <b>
                    {allergy}
                  </b>
                </p>
              )
            )
          : (
            <p className="muted">
              No allergy alerts.
            </p>
          )}
      </Card>
    </>
  );
}

function formatTime(
  time: string
) {
  if (!time) return "";

  const parts =
    time.split(":");

  const hour =
    Number(parts[0]);

  const minute =
    parts[1] || "00";

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  const displayHour =
    hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

const rootElement =
  document.getElementById(
    "root"
  );

if (!rootElement) {
  throw new Error(
    "HouseEats could not find the root element."
  );
}

createRoot(
  rootElement
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
