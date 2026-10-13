/** Rows of a CSV file as objects keyed by the header row. Handles quotes, commas and line breaks inside quotes, and a BOM. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell.trim()));
  if (!header) return [];
  const keys = header.map((key) => key.trim().toLowerCase());
  return body.map((cells) => Object.fromEntries(keys.map((key, column) => [key, (cells[column] ?? "").trim()])));
}

type LeadImportRow = { name: string; phone: string; city: string; email?: string; lodgeName?: string };

function pick(row: Record<string, string>, names: string[]) {
  for (const name of names) if (row[name]) return row[name];
  return "";
}

/**
 * Leads from the files we get: the Facebook form's CSV (full_name, whatsapp_number,
 * city, email), Leads Center's export (Name, Phone, WhatsApp number) and outreach
 * lists (Business name, Phone, City). Rows without a number are left out.
 */
export function leadsFromCsv(text: string): { leads: LeadImportRow[]; withoutNumber: number } {
  const rows = parseCsv(text);
  const leads: LeadImportRow[] = [];
  let withoutNumber = 0;
  for (const row of rows) {
    const phone = pick(row, ["whatsapp_number", "whatsapp number", "phone_number", "phone number", "phone", "secondary phone number"]);
    const business = pick(row, ["business name", "lodge_name", "lodge name", "lodge"]);
    const name = pick(row, ["full_name", "full name", "name"]) || business;
    if (!phone) {
      withoutNumber += 1;
      continue;
    }
    leads.push({
      name: name || "Lead",
      phone,
      city: pick(row, ["city", "town"]).replace(/^harara$/i, "Harare"),
      email: pick(row, ["email", "email address"]) || undefined,
      lodgeName: business || undefined,
    });
  }
  return { leads, withoutNumber };
}
