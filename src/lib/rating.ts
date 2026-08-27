export function averageRating(rows: { rating: number }[]) {
  return rows.length ? rows.reduce((sum, r) => sum + r.rating, 0) / rows.length : 0;
}

/** "4.2" for a real average, an em dash placeholder when there is nothing to show. */
export function formatAverage(average: number) {
  return average ? average.toFixed(1) : "—";
}

export function starString(rating: number) {
  return "★★★★★".slice(0, Math.max(0, Math.min(5, Math.round(rating))));
}

export function ratingCountLabel(count: number) {
  return `${count} ${count === 1 ? "rating" : "ratings"}`;
}

export const STAR_VALUES = [1, 2, 3, 4, 5];

export const COMMENT_MAX = 1000;

export function isValidRating(rating: number) {
  return rating >= 1 && rating <= 5;
}
