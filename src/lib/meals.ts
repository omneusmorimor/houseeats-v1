import { supabase } from "./supabase";
import { toISODate } from "./calendar";
import { COMMENT_MAX } from "./rating";

export const ALLERGENS = ["Milk", "Eggs", "Wheat", "Soy", "Peanuts", "Tree Nuts", "Fish", "Shellfish", "Sesame"];

export const MEAL_TYPE_ORDER = ["lunch", "dinner"];

export const MEAL_COLUMNS = "id,meal_date,meal_type,name,description,allergens";
export const MEAL_SUMMARY_COLUMNS = "id,meal_date,meal_type,name";
export const MEAL_REVIEW_COLUMNS = "meal_id,rating,comment,created_at";
export const MEAL_REVIEW_FULL_COLUMNS = "id,meal_id,user_id,rating,comment,created_at";

export type Meal = {
  id: string;
  meal_date: string;
  meal_type: string;
  name: string;
  description: string;
  allergens: string[];
};

export type MealSortable = { meal_date: string; meal_type: string };

export function mealTypeRank(mealType: string) {
  const index = MEAL_TYPE_ORDER.indexOf(String(mealType || "").toLowerCase());
  return index < 0 ? 99 : index;
}

export function isServedMealType(mealType: string) {
  return MEAL_TYPE_ORDER.includes(String(mealType || "").toLowerCase());
}

export function sortMeals<T extends MealSortable>(items: T[]) {
  return [...items].sort(
    (a, b) => a.meal_date.localeCompare(b.meal_date) || mealTypeRank(a.meal_type) - mealTypeRank(b.meal_type)
  );
}

export function servedMeals<T extends MealSortable>(items: T[]) {
  return sortMeals(items.filter((m) => isServedMealType(m.meal_type)));
}

export function mealsOnDate<T extends MealSortable>(items: T[], date: Date | string) {
  const iso = typeof date === "string" ? date : toISODate(date);
  return sortMeals(items.filter((m) => m.meal_date === iso));
}

export function allergyMatches(meal: { allergens?: string[] | null }, allergies: string[]) {
  return allergies.filter((a) => (meal.allergens || []).includes(a));
}

type SupabaseError = { message: string } | null | undefined;

export function firstErrorMessage(...errors: SupabaseError[]) {
  return errors.find(Boolean)?.message || "";
}

/** Meals of the currently active menu inside an inclusive date range. */
export async function fetchActiveMenuMeals(start: Date, end: Date) {
  const menu = await supabase
    .from("menus")
    .select("id")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (menu.error || !menu.data) return { meals: [] as Meal[], error: menu.error as SupabaseError };
  const result = await supabase
    .from("meals")
    .select(MEAL_COLUMNS)
    .eq("menu_id", menu.data.id)
    .gte("meal_date", toISODate(start))
    .lte("meal_date", toISODate(end))
    .order("meal_date");
  return { meals: servedMeals((result.data || []) as Meal[]), error: result.error as SupabaseError };
}

export const TITLE_MAX = 120,
  MESSAGE_MAX = 2000;

export async function sendMemberAnnouncement(rawTitle: string, rawMessage: string) {
  const title = rawTitle.trim();
  const message = rawMessage.trim();
  if (!title || !message) return { status: "Title and message are required.", sent: false };
  if (title.length > TITLE_MAX || message.length > MESSAGE_MAX)
    return {
      status: `Keep the title under ${TITLE_MAX} characters and the message under ${MESSAGE_MAX}.`,
      sent: false,
    };
  const { data, error } = await supabase.rpc("send_member_announcement", {
    p_title: title,
    p_message: message,
    p_type: "announcement",
  });
  if (error) return { status: error.message, sent: false };
  return { status: `${data || 0} members notified.`, sent: true };
}

export async function upsertMealReview<T>(
  input: { mealId: string; userId: string; rating: number; comment: string },
  columns = "*"
): Promise<{ data: T | null; error: SupabaseError }> {
  const { data, error } = await supabase
    .from("meal_reviews")
    .upsert(
      {
        meal_id: input.mealId,
        user_id: input.userId,
        rating: input.rating,
        comment: input.comment.trim().slice(0, COMMENT_MAX) || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "meal_id,user_id" }
    )
    .select(columns)
    .single();
  return { data: data as T | null, error };
}
