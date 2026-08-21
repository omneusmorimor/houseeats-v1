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
  LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./styles.css";

type Role = "member" | "chef" | "admin";
type RSVPStatus = "eating" | "not_eating";

type Profile = {
  id: string;
  chapter_id: string;
  role: Role;
  full_name?: string | null;
};

type MenuRecord = {
  id: string;
  chapter_id: string;
  name: string;
  service_date: string;
  published: boolean;
};

type Meal = {
  id: string;
  menu_id: string;
  title: string;
  description: string;
  service_time: string;
  sort_order: number;
};

type RSVP = {
  member_id: string;
  meal_id: string;
  status: RSVPStatus;
};

function App() {
  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [role, setRole] =
    useState<Role>("member");

  const [page, setPage] =
    useState("dashboard");

  const [menu, setMenu] =
    useState<MenuRecord | null>(null);

  const [meals, setMeals] =
    useState<Meal[]>([]);

  const [myRSVPs, setMyRSVPs] =
    useState<Record<string, RSVPStatus>>({});

  const [kitchenRSVPs, setKitchenRSVPs] =
    useState<RSVP[]>([]);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadSession();
  }, []);

  async function loadSession() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      await loadProfile(session.user.id);
    } catch (err) {
      console.error(err);
      setError("Unable to load your account.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, chapter_id, role, full_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile error:", error);
      setError(
        "Your account exists, but your profile could not be loaded."
      );
      return;
    }

    const userProfile = data as Profile;

    setProfile(userProfile);
    setRole(userProfile.role);

    await loadMenu(userProfile);
  }

  async function loadMenu(userProfile: Profile) {
    setError("");

    const { data: menuData, error: menuError } =
      await supabase
        .from("menus")
        .select(
          "id, chapter_id, name, service_date, published"
        )
        .eq("chapter_id", userProfile.chapter_id)
        .eq("published", true)
        .order("service_date", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

    if (menuError) {
      console.error("Menu error:", menuError);
      setError("Unable to load the menu.");
      return;
    }

    if (!menuData) {
      setMenu(null);
      setMeals([]);
      setMyRSVPs({});
      setKitchenRSVPs([]);
      return;
    }

    setMenu(menuData as MenuRecord);

    const { data: mealData, error: mealError } =
      await supabase
        .from("meals")
.select(
  "id, menu_id, title, description, service_time, meal_date, meal_type, sort_order"
)
.eq("menu_id", menuData.id)
.order("sort_order", {
  ascending: true,
});

    if (mealError) {
      console.error("Meals error:", mealError);
      setError("Unable to load the meals.");
      return;
    }

    const loadedMeals =
      (mealData as Meal[]) || [];

    setMeals(loadedMeals);

    if (loadedMeals.length === 0) {
      setMyRSVPs({});
      setKitchenRSVPs([]);
      return;
    }

    const mealIds = loadedMeals.map(
      (meal) => meal.id
    );

    /*
     * Members only need their own RSVPs.
     */
    if (userProfile.role === "member") {
      const {
        data: rsvpData,
        error: rsvpError,
      } = await supabase
        .from("rsvps")
        .select(
          "member_id, meal_id, status"
        )
        .eq("member_id", userProfile.id)
        .in("meal_id", mealIds);

      if (rsvpError) {
        console.error(
          "RSVP error:",
          rsvpError
        );
        return;
      }

      const map: Record<
        string,
        RSVPStatus
      > = {};

      (rsvpData || []).forEach(
        (rsvp) => {
          map[rsvp.meal_id] =
            rsvp.status as RSVPStatus;
        }
      );

      setMyRSVPs(map);
    }

    /*
     * Kitchen/admin can see all RSVPs.
     */
    if (userProfile.role !== "member") {
      const {
        data: allRSVPData,
        error: allRSVPError,
      } = await supabase
        .from("rsvps")
        .select(
          "member_id, meal_id, status"
        )
        .in("meal_id", mealIds);

      if (allRSVPError) {
        console.error(
          "Kitchen RSVP error:",
          allRSVPError
        );
        return;
      }

      setKitchenRSVPs(
        (allRSVPData || []) as RSVP[]
      );
    }
  }

  async function saveRSVP(
    mealId: string,
    status: RSVPStatus
  ) {
    if (!profile) return;

    setError("");

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
        "Save RSVP error:",
        error
      );

      /*
       * If the database doesn't have the
       * unique constraint, use a manual
       * update/insert instead.
       */
      const { data: existing } =
        await supabase
          .from("rsvps")
          .select("id")
          .eq(
            "member_id",
            profile.id
          )
          .eq("meal_id", mealId)
          .maybeSingle();

      if (existing) {
        const { error: updateError } =
          await supabase
            .from("rsvps")
            .update({ status })
            .eq(
              "id",
              existing.id
            );

        if (updateError) {
          console.error(
            updateError
          );
          setError(
            "Your RSVP could not be saved."
          );
          return;
        }
      } else {
        const { error: insertError } =
          await supabase
            .from("rsvps")
            .insert({
              member_id:
                profile.id,
              meal_id: mealId,
              status,
            });

        if (insertError) {
          console.error(
            insertError
          );
          setError(
            "Your RSVP could not be saved."
          );
          return;
        }
      }
    }

    setMyRSVPs((current) => ({
      ...current,
      [mealId]: status,
    }));

    /*
     * Refresh kitchen numbers if this
     * account has kitchen access.
     */
    if (profile.role !== "member") {
      await loadMenu(profile);
    }
  }

  async function logout() {
    await supabase.auth.signOut();

    setProfile(null);
    setMenu(null);
    setMeals([]);
    setMyRSVPs({});
    setKitchenRSVPs([]);
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
        onLogin={loadSession}
        error={error}
      />
    );
  }

  const kitchen =
    role !== "member";

  return (
    <div className="app">
      <header>
        <b className="brand">
          <UtensilsCrossed />
          HouseEats
        </b>

        <button
          className="icon-button"
          onClick={logout}
          title="Sign out"
        >
          <LogOut />
        </button>
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
              {r
                .charAt(0)
                .toUpperCase() +
                r.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {page === "dashboard" && (
          <Dashboard
            kitchen={kitchen}
            meals={meals}
            myRSVPs={myRSVPs}
            kitchenRSVPs={
              kitchenRSVPs
            }
            setPage={setPage}
            menu={menu}
          />
        )}

        {page === "menu" && (
          <MenuPage
            kitchen={kitchen}
            meals={meals}
            myRSVPs={myRSVPs}
            saveRSVP={saveRSVP}
          />
        )}

        {page === "rsvp" && (
          <RSVPPage
            meals={meals}
            myRSVPs={myRSVPs}
            saveRSVP={saveRSVP}
          />
        )}

        {page === "allergies" && (
  <AlertsPage
    kitchenRSVPs={
      kitchenRSVPs
    }
  />
)}

        {page === "late" && (
          <LatePage />
        )}

        {page === "notifications" && (
          <NotificationsPage />
        )}

        {page === "headcount" && (
          <HeadcountPage
            meals={meals}
            rsvps={kitchenRSVPs}
          />
        )}
        {page === "weekly-menu" && (
  <KitchenMenuPage
    menu={menu}
    meals={meals}
    setMeals={setMeals}
  />
)}

        {page === "allergy" && (
  <AllergyPage />
)}

{page === "allergies" && (
  <AlertsPage
    kitchenRSVPs={
      kitchenRSVPs
    }
  />
)}
      </main>

      <nav>
        {(kitchen
          ? [
              [
                "dashboard",
                "Kitchen",
              ],
              [
                "headcount",
                "Headcount",
              ],
              [
                "allergies",
                "Allergies",
              ],
              [
                "late",
                "Late Plates",
              ],
              ["menu", "Menu"],
            ]
          : [
              [
                "dashboard",
                "Home",
              ],
              ["menu", "Menu"],
              ["rsvp", "RSVP"],
              [
                "allergy",
                "Allergy",
              ],
              ["late", "Late"],
              [
                "notifications",
                "Updates",
              ],
            ]
        ).map(
          ([pageName, label]) => (
            <button
              key={pageName}
              className={
                page === pageName
                  ? "sel"
                  : ""
              }
              onClick={() =>
                setPage(pageName)
              }
            >
              {pageName ===
                "dashboard" && (
                <Home />
              )}

              {pageName ===
                "menu" && (
                <MenuIcon />
              )}

              {(pageName ===
                "rsvp" ||
                pageName ===
                  "headcount") && (
                <CalendarCheck />
              )}

              {(pageName ===
                "allergy" ||
                pageName ===
                  "allergies") && (
                <ShieldAlert />
              )}

              {pageName ===
                "late" && (
                <Clock3 />
              )}

              {pageName ===
                "notifications" && (
                <Bell />
              )}

              <small>
                {label}
              </small>
            </button>
          )
        )}
      </nav>
    </div>
  );
}

function Login({
  onLogin,
  error: initialError,
}: {
  onLogin: () => Promise<void>;
  error: string;
}) {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState(initialError);

  const [loading, setLoading] =
    useState(false);

  async function signIn() {
    setLoading(true);
    setError("");

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
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(
              e.target.value
            )
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />

        {error && (
          <p className="error">
            {error}
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
      </div>
    </div>
  );
}

function Dashboard({
  kitchen,
  meals,
  myRSVPs,
  kitchenRSVPs,
  setPage,
  menu,
}: {
  kitchen: boolean;
  meals: Meal[];
  myRSVPs: Record<
    string,
    RSVPStatus
  >;
  kitchenRSVPs: RSVP[];
  setPage: (page: string) => void;
  menu: MenuRecord | null;
}) {
  const [allergyAlertCount, setAllergyAlertCount] =
  useState(0);

useEffect(() => {
  if (kitchen) {
    loadKitchenAllergyCount();
  }
}, [kitchen, kitchenRSVPs]);

async function loadKitchenAllergyCount() {
  const eatingMembers =
    kitchenRSVPs.filter(
      (rsvp) =>
        rsvp.status === "eating"
    );

  if (eatingMembers.length === 0) {
    setAllergyAlertCount(0);
    return;
  }

  const memberIds =
    eatingMembers.map(
      (rsvp) => rsvp.member_id
    );

  const { data, error } =
    await supabase
      .from("allergy_profiles")
      .select(
        "member_id, allergies, dietary_restrictions, notes"
      )
      .in(
        "member_id",
        memberIds
      );

  if (error) {
    console.error(
      "Allergy count error:",
      error
    );
    setAllergyAlertCount(0);
    return;
  }

  const count =
    (data || []).filter(
      (profile) =>
        (profile.allergies?.length ?? 0) > 0 ||
        (profile.dietary_restrictions?.length ?? 0) > 0 ||
        !!profile.notes
    ).length;

  setAllergyAlertCount(count);
}
  if (kitchen) {
    const expected =
      kitchenRSVPs.filter(
        (rsvp) =>
          rsvp.status ===
          "eating"
      ).length;

    const late =
      kitchenRSVPs.filter(
        (rsvp) =>
          false
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
            <b>{late}</b>
            <small>
              Late plates
            </small>
          </Card>

          <Card>
            <b>
  {allergyAlertCount}
</b>
<small>
  Allergy alerts
</small>
          </Card>

          <Card>
            <b>
              {meals.length}
            </b>
            <small>
              Menu items
            </small>
          </Card>
        </div>

        <Card>
          <h2>
            {menu?.name ||
              "Tonight"}
          </h2>

          {meals.length === 0 ? (
            <p className="muted">
              No meals posted.
            </p>
          ) : (
            meals.map(
              (meal) => (
                <p
                  key={meal.id}
                >
                  {meal.title}
                  {" · "}
                  {formatTime(
                    meal.service_time
                  )}
                </p>
              )
            )
          )}

          <button
            className="primary"
            onClick={() =>
              setPage(
                "headcount"
              )
            }
          >
            <button
  className="primary"
  type="button"
  onClick={() =>
    setPage("weekly-menu")
  }
>
  Manage weekly menu
</button>
            Open headcount
            <ChevronRight />
          </button>
        </Card>
      </>
    );
  }

  const firstMeal =
    meals[0];

  return (
    <>
      <div className="hero">
        <p>
          TONIGHT'S DINNER
        </p>

        <h1>
          {firstMeal
            ? firstMeal.title
            : "No dinner posted"}
        </h1>

        {firstMeal && (
          <span>
            {formatTime(
              firstMeal.service_time
            )}
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
            firstMeal &&
            myRSVPs[
              firstMeal.id
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
          subtitle="Need one later?"
          icon={
            <Clock3 />
          }
          onClick={() =>
            setPage("late")
          }
        />

        <Action
          title="Full menu"
          subtitle="See all meals"
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

function MenuPage({
  kitchen,
  meals,
  myRSVPs,
  saveRSVP,
}: {
  kitchen: boolean;
  meals: Meal[];
  myRSVPs: Record<
    string,
    RSVPStatus
  >;
  saveRSVP: (
    mealId: string,
    status: RSVPStatus
  ) => Promise<void>;
}) {
  return (
    <>
      <p className="eyebrow">
        MEALS
      </p>

      <h1>
        {kitchen
          ? "Menu Management"
          : "Menu"}
      </h1>

      {meals.length === 0 ? (
        <Card>
          <h2>
            No meals posted
          </h2>

          <p className="muted">
            There are currently
            no meals on the
            published menu.
          </p>
        </Card>
      ) : (
        meals.map(
          (meal) => (
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
                      myRSVPs[
                        meal.id
                      ] ===
                      "eating"
                        ? "success"
                        : "primary"
                    }
                    onClick={() =>
                      saveRSVP(
                        meal.id,
                        myRSVPs[
                          meal.id
                        ] ===
                          "eating"
                          ? "not_eating"
                          : "eating"
                      )
                    }
                  >
                    {myRSVPs[
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
          )
        )
      )}
    </>
  );
}

function RSVPPage({
  meals,
  myRSVPs,
  saveRSVP,
}: {
  meals: Meal[];
  myRSVPs: Record<
    string,
    RSVPStatus
  >;
  saveRSVP: (
    mealId: string,
    status: RSVPStatus
  ) => Promise<void>;
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

      {meals.length === 0 ? (
        <Card>
          <p className="muted">
            No meals available.
          </p>
        </Card>
      ) : (
        meals.map(
          (meal) => (
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
                      myRSVPs[
                        meal.id
                      ] ===
                      "eating"
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
                      myRSVPs[
                        meal.id
                      ] ===
                      "not_eating"
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
          )
        )
      )}
    </>
  );
}

function AllergyPage() {
  const [allergies, setAllergies] =
    useState<string[]>([]);

  const [
    dietaryRestrictions,
    setDietaryRestrictions,
  ] = useState<string[]>([]);

  const [notes, setNotes] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const allergyOptions = [
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

  useEffect(() => {
    loadAllergyProfile();
  }, []);

  async function loadAllergyProfile() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } =
      await supabase
        .from("allergy_profiles")
        .select(
          "allergies, dietary_restrictions, notes"
        )
        .eq("member_id", user.id)
        .maybeSingle();

    if (error) {
      console.error(
        "Allergy profile error:",
        error
      );

      setMessage(
        "Unable to load allergy profile."
      );

      setLoading(false);
      return;
    }

    if (data) {
      setAllergies(
        data.allergies || []
      );

      setDietaryRestrictions(
        data.dietary_restrictions || []
      );

      setNotes(
        data.notes || ""
      );
    }

    setLoading(false);
  }

  function toggleAllergy(
    allergy: string
  ) {
    setAllergies((current) =>
      current.includes(allergy)
        ? current.filter(
            (item) =>
              item !== allergy
          )
        : [...current, allergy]
    );
  }

  function toggleDietary(
    restriction: string
  ) {
    setDietaryRestrictions(
      (current) =>
        current.includes(restriction)
          ? current.filter(
              (item) =>
                item !== restriction
            )
          : [
              ...current,
              restriction,
            ]
    );
  }

  async function saveAllergyProfile() {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage(
        "You must be signed in."
      );
      setSaving(false);
      return;
    }

    const { error } =
      await supabase
        .from("allergy_profiles")
        .upsert(
          {
            member_id: user.id,
            allergies,
            dietary_restrictions:
              dietaryRestrictions,
            notes,
            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "member_id",
          }
        );

    if (error) {
      console.error(
        "Save allergy profile error:",
        error
      );

      setMessage(
        "Unable to save your allergy profile."
      );

      setSaving(false);
      return;
    }

    setMessage(
      "Allergy profile saved successfully."
    );

    setSaving(false);
  }

  if (loading) {
    return (
      <>
        <p className="eyebrow">
          PRIVATE PROFILE
        </p>

        <h1>
          Allergy & dietary
          profile
        </h1>

        <Card>
          <p className="muted">
            Loading allergy profile...
          </p>
        </Card>
      </>
    );
  }

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
        This information is private
        and is only available to
        authorized kitchen and
        admin users.
      </p>

      <Card>
        <h2>
          Allergies
        </h2>

        <div className="chips">
          {allergyOptions.map(
            (allergy) => {
              const active =
                allergies.includes(
                  allergy
                );

              return (
                <button
                  key={allergy}
                  type="button"
                  className={
                    active
                      ? "chip active"
                      : "chip"
                  }
                  onClick={() =>
                    toggleAllergy(
                      allergy
                    )
                  }
                >
                  {active && (
                    <Check />
                  )}

                  {allergy}
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
            (restriction) => {
              const active =
                dietaryRestrictions.includes(
                  restriction
                );

              return (
                <button
                  key={restriction}
                  type="button"
                  className={
                    active
                      ? "chip active"
                      : "chip"
                  }
                  onClick={() =>
                    toggleDietary(
                      restriction
                    )
                  }
                >
                  {active && (
                    <Check />
                  )}

                  {restriction}
                </button>
              );
            }
          )}
        </div>
      </Card>

      <Card>
        <h2>
          Notes for the kitchen
        </h2>

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
          placeholder="Anything the kitchen should know about your allergies or dietary needs?"
          rows={4}
        />
      </Card>

      {message && (
        <p className="green">
          {message}
        </p>
      )}

      <button
        type="button"
        className="primary"
        onClick={
          saveAllergyProfile
        }
        disabled={saving}
      >
        {saving
          ? "Saving..."
          : "Save allergy profile"}
      </button>
    </>
  );
}

function LatePage() {
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
          Tell the kitchen
          you're running late.
        </p>

        <button
          className="primary"
          onClick={() =>
            alert(
              "Late plate feature coming next."
            )
          }
        >
          Request a late plate
        </button>
      </Card>
    </>
  );
}

function NotificationsPage() {
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
          Menu posted
        </b>

        <p>
          Your chapter's menu
          is available.
        </p>
      </Card>
    </>
  );
}

function HeadcountPage({
  meals,
  rsvps,
}: {
  meals: Meal[];
  rsvps: RSVP[];
}) {
  return (
    <>
      <p className="eyebrow">
        KITCHEN
      </p>

      <h1>
        Headcount
      </h1>

      {meals.map(
        (meal) => {
          const count =
            rsvps.filter(
              (rsvp) =>
                rsvp.meal_id ===
                  meal.id &&
                rsvp.status ===
                  "eating"
            ).length;

          return (
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

                <div className="big">
                  {count}
                </div>
              </div>

              <p className="muted">
                confirmed eating
              </p>
            </Card>
          );
        }
      )}

      {meals.length === 0 && (
        <Card>
          <p className="muted">
            No meals available.
          </p>
        </Card>
      )}
    </>
  );
}

function AlertsPage({
  kitchenRSVPs,
}: {
  kitchenRSVPs: RSVP[];
}) {
  const [alerts, setAlerts] =
    useState<
      {
        member_id: string;
        meal_id: string;
        allergies: string[];
        dietary_restrictions: string[];
        notes: string | null;
      }[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadAllergyAlerts();
  }, [kitchenRSVPs]);

  async function loadAllergyAlerts() {
    setLoading(true);

    const eatingRSVPs =
      kitchenRSVPs.filter(
        (rsvp) =>
          rsvp.status === "eating"
      );

    if (eatingRSVPs.length === 0) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    const memberIds =
      eatingRSVPs.map(
        (rsvp) =>
          rsvp.member_id
      );

    const { data, error } =
      await supabase
        .from("allergy_profiles")
        .select(
          "member_id, allergies, dietary_restrictions, notes"
        )
        .in(
          "member_id",
          memberIds
        );

    if (error) {
      console.error(
        "Kitchen allergy error:",
        error
      );
      setAlerts([]);
      setLoading(false);
      return;
    }

    const mealByMember =
      new Map<string, string>();

    eatingRSVPs.forEach(
      (rsvp) => {
        mealByMember.set(
          rsvp.member_id,
          rsvp.meal_id
        );
      }
    );

    const allergyAlerts =
      (data || [])
        .filter(
          (profile) =>
            (profile.allergies?.length ??
              0) > 0 ||
            (profile
              .dietary_restrictions
              ?.length ?? 0) > 0 ||
            !!profile.notes
        )
        .map(
          (profile) => ({
            member_id:
              profile.member_id,
            meal_id:
              mealByMember.get(
                profile.member_id
              ) || "",
            allergies:
              profile.allergies || [],
            dietary_restrictions:
              profile.dietary_restrictions ||
              [],
            notes:
              profile.notes || null,
          })
        );

    setAlerts(
      allergyAlerts
    );

    setLoading(false);
  }

  if (loading) {
    return (
      <>
        <p className="eyebrow">
          KITCHEN
        </p>

        <h1>
          Allergy Alerts
        </h1>

        <Card>
          <p className="muted">
            Loading allergy alerts...
          </p>
        </Card>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow">
        KITCHEN
      </p>

      <h1>
        Allergy Alerts
      </h1>

      {alerts.length === 0 ? (
        <Card>
          <p className="muted">
            No allergy alerts for
            members eating tonight.
          </p>
        </Card>
      ) : (
        alerts.map(
          (alert) => (
            <Card
              key={`${alert.member_id}-${alert.meal_id}`}
            >
              <h2>
                ⚠️ Allergy Alert
              </h2>

              {alert.allergies.length >
                0 && (
                <p>
                  <strong>
                    Allergies:
                  </strong>{" "}
                  {alert.allergies.join(
                    ", "
                  )}
                </p>
              )}

              {alert.dietary_restrictions
                .length > 0 && (
                <p>
                  <strong>
                    Dietary:
                  </strong>{" "}
                  {alert.dietary_restrictions.join(
                    ", "
                  )}
                </p>
              )}

              {alert.notes && (
                <p>
                  <strong>
                    Notes:
                  </strong>{" "}
                  {alert.notes}
                </p>
              )}
            </Card>
          )
        )
      )}
    </>
  );
}
function KitchenMenuPage({
  menu,
  meals,
  setMeals,
}: {
  menu: MenuRecord | null;
  meals: Meal[];
  setMeals: React.Dispatch<
    React.SetStateAction<Meal[]>
  >;
}) {
  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [selectedDay, setSelectedDay] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [mealType, setMealType] =
    useState<"lunch" | "dinner">(
      "lunch"
    );

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [serviceTime, setServiceTime] =
    useState("");

  const days = Array.from(
    { length: 7 },
    (_, index) => {
      const date =
        new Date();

      date.setDate(
        date.getDate() + index
      );

      return date;
    }
  );

  async function saveMeal() {
    if (!menu?.id) {
      setMessage(
        "No active menu found."
      );
      return;
    }

    if (!title.trim()) {
      setMessage(
        "Enter a meal name."
      );
      return;
    }

    if (!serviceTime) {
      setMessage(
        "Enter a serving time."
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const { data, error } =
      await supabase
        .from("meals")
        .insert({
          menu_id: menu.id,
          title: title.trim(),
          description:
            description.trim(),
          service_time:
            serviceTime,
          meal_date:
            selectedDay,
          meal_type:
            mealType,
          sort_order: meals.length,
        })
        .select()
        .single();

    if (error) {
      console.error(
        "Create meal error:",
        error
      );

      setMessage(
        "Unable to create meal."
      );

      setSaving(false);
      return;
    }

    setMeals((current) => [
      ...current,
      data as Meal,
    ]);

    setTitle("");
    setDescription("");
    setServiceTime("");

    setMessage(
      "Meal added successfully."
    );

    setSaving(false);
  }

  return (
    <>
      <p className="eyebrow">
        KITCHEN
      </p>

      <h1>
        Weekly Menu
      </h1>

      <Card>
        <h2>
          Add a meal
        </h2>

        <label>
          Day
        </label>

        <select
          value={selectedDay}
          onChange={(event) =>
            setSelectedDay(
              event.target.value
            )
          }
        >
          {days.map((date) => {
            const value =
              date
                .toISOString()
                .split("T")[0];

            return (
              <option
                key={value}
                value={value}
              >
                {date.toLocaleDateString(
                  undefined,
                  {
                    weekday:
                      "long",
                    month:
                      "short",
                    day: "numeric",
                  }
                )}
              </option>
            );
          })}
        </select>

        <label>
          Meal
        </label>

        <select
          value={mealType}
          onChange={(event) =>
            setMealType(
              event.target
                .value as
                | "lunch"
                | "dinner"
            )
          }
        >
          <option value="lunch">
            Lunch
          </option>

          <option value="dinner">
            Dinner
          </option>
        </select>

        <label>
          Meal name
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(
              event.target.value
            )
          }
          placeholder="Chicken Alfredo"
        />

        <label>
          Serving time
        </label>

        <input
          type="time"
          value={serviceTime}
          onChange={(event) =>
            setServiceTime(
              event.target.value
            )
          }
        />

        <label>
          Description
        </label>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          placeholder="Chicken, pasta, salad..."
          rows={3}
        />

        {message && (
          <p className="green">
            {message}
          </p>
        )}

        <button
          className="primary"
          type="button"
          onClick={saveMeal}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Add meal"}
        </button>
      </Card>

      <Card>
        <h2>
          This week's meals
        </h2>

        {meals.length === 0 ? (
          <p className="muted">
            No meals have been
            added yet.
          </p>
        ) : (
          meals
            .filter(
              (meal) =>
                meal.meal_date
            )
            .sort((a, b) =>
              String(
                a.meal_date
              ).localeCompare(
                String(
                  b.meal_date
                )
              )
            )
            .map((meal) => (
              <div
                key={meal.id}
              >
                <h3>
                  {meal.meal_type ===
                  "dinner"
                    ? "Dinner"
                    : "Lunch"}
                  {" — "}
                  {meal.title}
                </h3>

                <p className="muted">
                  {meal.meal_date}
                  {" · "}
                  {formatTime(
                    meal.service_time
                  )}
                </p>

                {meal.description && (
                  <p>
                    {meal.description}
                  </p>
                )}
              </div>
            ))
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

const root =
  document.getElementById(
    "root"
  );

if (!root) {
  throw new Error(
    "HouseEats root element was not found."
  );
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
   
