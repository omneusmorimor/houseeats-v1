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

type MenuRecord = {
  id: string;
  chapter_id: string;
  name: string;
  service_date: string;
  published: boolean;
  created_at: string;
};

type Meal = {
  id: string;
  menu_id: string;
  title: string;
  description: string;
  service_time: string;
  sort_order: number;
};

type RSVPStatus = "eating" | "not_eating";

type RSVPRecord = Record<string, RSVPStatus>;

function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role>("member");
  const [page, setPage] = useState("dashboard");

  const [meals, setMeals] = useState<Meal[]>([]);
  const [menu, setMenu] = useState<MenuRecord | null>(null);
  const [kitchenHeadcount, setKitchenHeadcount] = useState(0); [rsvps, setRsvps] = useState<RSVPRecord>({});

  const [latePlate, setLatePlate] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

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
      console.error(error);
      setLoading(false);
    }
  }

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, chapter_id, full_name, role, created_at"
        )
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Profile error:", error);
        setProfile(null);
        setLoading(false);
        return;
      }

      const userProfile = data as Profile;

      setProfile(userProfile);
      setRole(userProfile.role);

      await loadMenuData(userProfile);
    } catch (error) {
      console.error("Profile loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMenuData(userProfile: Profile) {
    setDataLoading(true);
    setDataError("");

    try {
      const { data: menuData, error: menuError } =
        await supabase
          .from("menus")
          .select(
            "id, chapter_id, name, service_date, published, created_at"
          )
          .eq("chapter_id", userProfile.chapter_id)
          .eq("published", true)
          .order("service_date", {
            ascending: true,
          })
          .limit(1)
          .maybeSingle();

      if (menuError) {
        throw menuError;
      }

      if (!menuData) {
        setMenu(null);
        setMeals([]);
        setRsvps({});
        setDataLoading(false);
        return;
      }

      setMenu(menuData as MenuRecord);

      const { data: mealData, error: mealError } =
        await supabase
          .from("meals")
          .select(
            "id, menu_id, title, description, service_time, sort_order"
          )
          .eq("menu_id", menuData.id)
          .order("sort_order", {
            ascending: true,
          });

      if (mealError) {
        throw mealError;
      }

      const loadedMeals =
        (mealData as Meal[]) || [];

      setMeals(loadedMeals);

      if (loadedMeals.length === 0) {
        setRsvps({});
        setDataLoading(false);
        return;
      }

      const mealIds = loadedMeals.map(
        (meal) => meal.id
      );

      let rsvpQuery = supabase
  .from("rsvps")
  .select("member_id, meal_id, status")
  .in("meal_id", mealIds);

if (userProfile.role === "member") {
  rsvpQuery = rsvpQuery.eq(
    "member_id",
    userProfile.id
  );
}

const { data: rsvpData, error: rsvpError } =
  await rsvpQuery;

      if (rsvpError) {
        throw rsvpError;
      }

      const rsvpMap: RSVPRecord = {};

(rsvpData || []).forEach((rsvp) => {
  if (rsvp.member_id === userProfile.id) {
    rsvpMap[rsvp.meal_id] =
      rsvp.status as RSVPStatus;
  }
});

setRsvps(rsvpMap);
    } catch (error) {
      console.error(
        "Menu loading error:",
        error
      );

      setDataError(
        "We couldn't load the menu right now."
      );
    } finally {
      setDataLoading(false);
    }
  }

  async function saveRSVP(
    mealId: string,
    status: RSVPStatus
  ) {
    if (!profile) return;

    setDataError("");

    const { error } = await supabase
      .from("rsvps")
      .upsert(
        {
          member_id: profile.id,
          meal_id: mealId,
          status,
        },
        {
          onConflict:
            "member_id,meal_id",
        }
      );

    if (error) {
      console.error(
        "RSVP error:",
        error
      );

      setDataError(
        "Your RSVP could not be saved."
      );

      return;
    }

    setRsvps((current) => ({
      ...current,
      [mealId]: status,
    }));
  }

  if (loading) {
    return (
      <div className="login">
        <div className="loginbox">
          <h1>
            <UtensilsCrossed />
            HouseEats
          </h1>

          <p>
            Loading your account...
          </p>
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

  const kitchen = role !== "member";

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
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
          >
            <LogOut />
          </button>
        </div>
      </header>

      <main>
        <div className="roles">
          {(
            [
              "member",
              "chef",
              "admin",
            ] as Role[]
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

        {dataError && (
          <div className="error">
            {dataError}
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard
            kitchen={kitchen}
            meals={meals}
            rsvps={rsvps}
            late={latePlate}
            setPage={setPage}
            loading={dataLoading}
          />
        )}

        {page === "menu" && (
          <Menu
            kitchen={kitchen}
            meals={meals}
            rsvps={rsvps}
            saveRSVP={saveRSVP}
            loading={dataLoading}
          />
        )}

        {page === "rsvp" && (
          <RSVP
            meals={meals}
            rsvps={rsvps}
            saveRSVP={saveRSVP}
            loading={dataLoading}
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
          <Headcount
            rsvps={rsvps}
          />
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
        "Account created. Check your email if confirmation is required."
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
  meals,
  rsvps,
  late,
  setPage,
  loading,
}: {
  kitchen: boolean;
  meals: Meal[];
  rsvps: RSVPRecord;
  late: boolean;
  setPage: (page: string) => void;
  loading: boolean;
}) {
  if (kitchen) {
    const expected =
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
            <b>{meals.length}</b>
            <small>
              Menu items
            </small>
          </Card>
        </div>

        <Card>
          <h2>Tonight</h2>

          {loading ? (
            <p>
              Loading menu...
            </p>
          ) : meals.length === 0 ? (
            <p className="muted">
              No meals have been
              published yet.
            </p>
          ) : (
            <p>
              {meals[0].title}
              {" · "}
              {formatTime(
                meals[0]
                  .service_time
              )}
            </p>
          )}

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

  const tonight =
    meals.length > 0
      ? meals[0]
      : null;

  return (
    <>
      <div className="hero">
        <p>
          TONIGHT'S DINNER
        </p>

        <h1>
          {loading
            ? "Loading..."
            : tonight
            ? tonight.title
            : "No dinner posted"}
        </h1>

        {tonight && (
          <span>
            {formatTime(
              tonight.service_time
            )}{" "}
            · RSVP through the
            menu
          </span>
        )}
      </div>

      <h2>
        Quick actions
      </h2>

      <div className="actions">
        <Action
          title="RSVP"
          subtitle={
            tonight &&
            rsvps[
              tonight.id
            ] === "eating"
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
  meals,
  rsvps,
  saveRSVP,
  loading,
}: {
  kitchen: boolean;
  meals: Meal[];
  rsvps: RSVPRecord;
  saveRSVP: (
    mealId: string,
    status: RSVPStatus
  ) => Promise<void>;
  loading: boolean;
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

      {loading ? (
        <Card>
          <p>
            Loading meals...
          </p>
        </Card>
      ) : meals.length === 0 ? (
        <Card>
          <h2>
            No meals posted
          </h2>

          <p className="muted">
            Your chapter does not
            have a published meal
            yet.
          </p>
        </Card>
      ) : (
        meals.map((meal) => (
          <Card key={meal.id}>
            <div className="meal">
              <div>
                <small>
                  Meal
                </small>

                <h2>
                  {meal.title}
                </h2>

                <p>
                  {meal.description}
                </p>

                <span>
                  🍽{" "}
                  {formatTime(
                    meal.service_time
                  )}
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
                    saveRSVP(
                      meal.id,
                      rsvps[
                        meal.id
                      ] === "eating"
                        ? "not_eating"
                        : "eating"
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
        ))
      )}
    </>
  );
}

function RSVP({
  meals,
  rsvps,
  saveRSVP,
  loading,
}: {
  meals: Meal[];
  rsvps: RSVPRecord;
  saveRSVP: (
    mealId: string,
    status: RSVPStatus
  ) => Promise<void>;
  loading: boolean;
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

      {loading ? (
        <Card>
          <p>
            Loading meals...
          </p>
        </Card>
      ) : meals.length === 0 ? (
        <Card>
          <p className="muted">
            No meals are currently available.
          </p>
        </Card>
      ) : (
        meals.map((meal) => (
          <Card key={meal.id}>
            <div className="head">
              <div>
                <h2>
                  {meal.title}
                </h2>

                <p>
                  {formatTime(
                    meal.service_time
                  )}
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
                    saveRSVP(
                      meal.id,
                      "eating"
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
                    saveRSVP(
                      meal.id,
                      "not_eating"
                    )
                  }
                >
                  Not eating
                </button>
              </div>
            </div>
          </Card>
        ))
      )}
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
        <h2>
          Allergies
        </h2>

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
      
