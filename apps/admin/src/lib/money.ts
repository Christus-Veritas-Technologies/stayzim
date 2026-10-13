/** 3000 → "$30.00" */
export function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 30 → "$30" */
export function formatDollars(dollars: number) {
  return `$${dollars.toLocaleString("en-US")}`;
}
