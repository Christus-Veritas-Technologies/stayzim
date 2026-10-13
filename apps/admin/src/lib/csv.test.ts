import { describe, expect, test } from "bun:test";

import { leadsFromCsv, parseCsv } from "./csv";

describe("parseCsv", () => {
  test("quotes, commas and line breaks inside quotes", () => {
    const rows = parseCsv('﻿Name,Note\r\n"Moyo, Rudo","said ""hi""\nthen left"\r\nTendai,ok\r\n');
    expect(rows).toEqual([
      { name: "Moyo, Rudo", note: 'said "hi"\nthen left' },
      { name: "Tendai", note: "ok" },
    ]);
  });
});

describe("leadsFromCsv", () => {
  test("the Facebook form's export", () => {
    const csv = "id,full_name,whatsapp_number,city,inbox_url\n1,Nigel Mafukidze,+263784727939,Harare,https://x\n2,Innocent Ncube,+263782591173,Harara,";
    expect(leadsFromCsv(csv)).toEqual({
      leads: [
        { name: "Nigel Mafukidze", phone: "+263784727939", city: "Harare", email: undefined, lodgeName: undefined },
        { name: "Innocent Ncube", phone: "+263782591173", city: "Harare", email: undefined, lodgeName: undefined },
      ],
      withoutNumber: 0,
    });
  });

  test("Leads Center's export, where Messenger leads have no number", () => {
    const csv = "Created,Name,Email,Phone,WhatsApp number\n10/12/2026,Blessing Tobve,,,\n10/12/2026,Agnes Sibanda,a@x.test,,+263774268473";
    expect(leadsFromCsv(csv)).toEqual({ leads: [{ name: "Agnes Sibanda", phone: "+263774268473", city: "", email: "a@x.test", lodgeName: undefined }], withoutNumber: 1 });
  });

  test("an outreach list of lodges", () => {
    const csv = 'Business name,City,Phone,Website\n"Brasus Lodge",Bulawayo,078 441 8264,none';
    expect(leadsFromCsv(csv).leads).toEqual([{ name: "Brasus Lodge", phone: "078 441 8264", city: "Bulawayo", email: undefined, lodgeName: "Brasus Lodge" }]);
  });
});
