import type { Route } from "next";

type SearchParams = Record<string, string | string[] | undefined>;

/** "/create?plan=pro&utm_source=meta": old links (/signup, /start) keep their plan and ad tags. */
export function createPath(params: SearchParams) {
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((entry) => [key, entry]))),
  );
  query.delete("step");
  const text = query.toString();
  return `/create${text ? `?${text}` : ""}` as Route;
}
