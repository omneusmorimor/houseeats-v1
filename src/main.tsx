import React, { useState } from "react";
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
} from "lucide-react";
import "./styles.css";

type Role = "member" | "chef" | "admin";

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
  const [role, setRole] = useState<Role>("member");
  const [page, setPage] = useState("dashboard");
  const [signedIn, setSignedIn] = useState(false);
  const [rsvps, setRsvps] = useState<RSVPRecord>({});
  const [latePlate, setLatePlate] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);

  if (!signedIn) {
    return <Login onLogin={() => setSignedIn(true)} />;
  }

  const kitchen = role !== "member";

  return (
    <div className="app">
      <header>
        <b className="brand">
          <UtensilsCrossed />
          HouseEats
        </b>

        <Bell />
      </header>

      <main>
        <div className="roles">
          {(["member", "chef", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              className={role === r ? "on" : ""}
              onClick={() => {
                setRole(r);
                setPage("dashboard");
              }}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
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

        {page === "notifications" && <Notifications />}

        {page === "headcount" && (
          <Headcount rsvps={rsvps} />
        )}

        {page === "allergies" && (
          <Alerts allergies={allergies} />
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
              ["notifications", "Updates"],
            ]
        ).map(([p, label]) => (
          <button
            key={p}
            className={page === p ? "sel" : ""}
            onClick={() => setPage(p)}
          >
            {p === "dashboard" && <Home />}
            {p === "menu" && <MenuIcon />}
            {(p === "rsvp" || p === "headcount") && (
              <CalendarCheck />
            )}
            {(p === "allergy" || p === "allergies") && (
              <ShieldAlert />
            )}
            {p === "late" && <Clock3 />}
            {p === "notifications" && <Bell />}

            <small>{label}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="login">
      <div className="loginbox">
        <h1>
          <UtensilsCrossed />
          HouseEats
        </h1>

        <p>Your chapter's meal hub.</p>

        <input
          placeholder="Email"
          type="email"
        />

        <input
          placeholder="Password"
          type="password"
        />

        <button
          className="primary"
          onClick={onLogin}
        >
          Sign in
        </button>

        <button
          className="secondary"
          onClick={onLogin}
        >
          Preview V1
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
    const expected = Object.values(rsvps).filter(
      (value) => value === "eating"
    ).length;

    return (
      <>
        <p className="eyebrow">KITCHEN</p>

        <h1>Kitchen Dashboard</h1>

        <div className="stats">
          <Card>
            <b>{expected}</b>
            <small>Expected tonight</small>
          </Card>

          <Card>
            <b>{late ? 1 : 0}</b>
            <small>Late plates</small>
          </Card>

          <Card>
            <b>0</b>
            <small>Allergy alerts</small>
          </Card>

          <Card>
            <b>3</b>
            <small>Menu items</small>
          </Card>
        </div>

        <Card>
          <h2>Tonight</h2>

          <p>Chicken Alfredo · 5:30 PM</p>

          <button
            className="primary"
            onClick={() => setPage("headcount")}
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
        <p>TONIGHT'S DINNER</p>

        <h1>Chicken Alfredo</h1>

        <span>
          5:30 PM · RSVP by 3:00 PM
        </span>
      </div>

      <h2>Quick actions</h2>

      <div className="actions">
        <Action
          title="RSVP"
          subtitle={
            rsvps["1"] === "eating"
              ? "You're eating"
              : "Tell the kitchen"
          }
          icon={<CalendarCheck />}
          onClick={() => setPage("rsvp")}
        />

        <Action
          title="Allergies"
          subtitle="Keep your profile current"
          icon={<ShieldAlert />}
          onClick={() => setPage("allergy")}
        />

        <Action
          title="Late plate"
          subtitle={
            late ? "Requested" : "Need one later?"
          }
          icon={<Clock3 />}
          onClick={() => setPage("late")}
        />

        <Action
          title="Full menu"
          subtitle="See upcoming meals"
          icon={<MenuIcon />}
          onClick={() => setPage("menu")}
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
        <small>{subtitle}</small>
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
          <p className="eyebrow">MEALS</p>

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
              <small>{meal.day}</small>

              <h2>{meal.name}</h2>

              <p>{meal.description}</p>

              <span>🍽 5:30 PM</span>
            </div>

            {!kitchen && (
              <button
                className={
                  rsvps[meal.id] === "eating"
                    ? "success"
                    : "primary"
                }
                onClick={() =>
                  setRsvps((current) => ({
                    ...current,
                    [meal.id]:
                      current[meal.id] === "eating"
                        ? "not_eating"
                        : "eating",
                  }))
                }
              >
                {rsvps[meal.id] === "eating" ? (
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
      <p className="eyebrow">DINNER RSVP</p>

      <h1>Who's eating?</h1>

      <p className="muted">
        Your RSVP helps the kitchen prepare
        the right amount.
      </p>

      {meals.slice(0, 2).map((meal) => (
        <Card key={meal.id}>
          <div className="head">
            <div>
              <h2>{meal.name}</h2>

              <p>
                {meal.day} · 5:30 PM
              </p>
            </div>

            <div className="choice">
              <button
                className={
                  rsvps[meal.id] === "eating"
                    ? "on"
                    : ""
                }
                onClick={() =>
                  setRsvps((current) => ({
                    ...current,
                    [meal.id]: "eating",
                  }))
                }
              >
                Eating
              </button>

              <button
                className={
                  rsvps[meal.id] === "not_eating"
                    ? "on"
                    : ""
                }
                onClick={() =>
                  setRsvps((current) => ({
                    ...current,
                    [meal.id]: "not_eating",
                  }))
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
      <p className="eyebrow">PRIVATE PROFILE</p>

      <h1>Allergy & dietary profile</h1>

      <p className="muted">
        Only authorized kitchen/admin users
        can see allergy details.
      </p>

      <Card>
        <h2>Allergies</h2>

        <div className="chips">
          {options.map((option) => {
            const active =
              allergies.includes(option);

            return (
              <button
                key={option}
                className={
                  active
                    ? "chip active"
                    : "chip"
                }
                onClick={() =>
                  setAllergies((current) =>
                    active
                      ? current.filter(
                          (item) =>
                            item !== option
                        )
                      : [...current, option]
                  )
                }
              >
                {active && <Check />}
                {option}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2>Dietary restrictions</h2>

        <div className="chips">
          {dietaryOptions.map((option) => (
            <button
              key={option}
              className="chip"
            >
              {option}
            </button>
          ))}
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
      <p className="eyebrow">DINNER SERVICE</p>

      <h1>Late plate</h1>

      <Card>
        <h2>Running late?</h2>

        <p>
          Tell the kitchen to hold a plate
          for you.
        </p>

        <button
          className={
            late ? "success" : "primary"
          }
          onClick={() => setLate(!late)}
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
            The kitchen has been notified.
          </p>
        )}
      </Card>
    </>
  );
}

function Notifications() {
  return (
    <>
      <p className="eyebrow">UPDATES</p>

      <h1>Notifications</h1>

      <Card>
        <b>Dinner RSVP reminder</b>

        <p>
          Don't forget to RSVP before 3:00 PM.
        </p>
      </Card>

      <Card>
        <b>Menu posted</b>

        <p>
          Tonight's dinner is Chicken Alfredo.
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
  const count = Object.values(rsvps).filter(
    (value) => value === "eating"
  ).length;

  return (
    <>
      <p className="eyebrow">KITCHEN</p>

      <h1>Headcount</h1>

      <div className="big">
        {count}
      </div>

      <p className="center muted">
        confirmed RSVPs in this preview
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
      <p className="eyebrow">KITCHEN</p>

      <h1>Allergy Alerts</h1>

      <Card>
        {allergies.length > 0 ? (
          allergies.map((allergy) => (
            <p key={allergy}>
              ⚠️ <b>{allergy}</b>
            </p>
          ))
        ) : (
          <p className="muted">
            No allergy alerts in this preview.
          </p>
        )}
      </Card>
    </>
  );
}

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "HouseEats could not find the root element."
  );
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
