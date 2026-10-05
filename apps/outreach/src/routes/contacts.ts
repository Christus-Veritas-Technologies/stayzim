import { zValidator } from "@hono/zod-validator";
import prisma from "@stayzim/db";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import { CONTACT_STATUSES, getContactStats } from "../outreach";
import { normalizePhone } from "../whatsapp";

/** Accepts "+263 77 123 4567", "263-77-123-4567", ... and stores digits only. */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\d{8,15}$/, "Phone must be 8–15 digits including the country code"));

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: phoneSchema,
  city: z.string().trim().min(1).max(100),
});

const createContactsSchema = z.union([contactSchema, z.array(contactSchema).min(1).max(5000)]);

const listQuerySchema = z.object({
  status: z.enum(CONTACT_STATUSES).optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

const updateContactSchema = contactSchema
  .extend({ status: z.enum(CONTACT_STATUSES) })
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

export const contacts: Hono = new Hono()
  .post("/", zValidator("json", createContactsSchema), async (c) => {
    const input = c.req.valid("json");
    const list = Array.isArray(input) ? input : [input];

    // Existing phone numbers (and repeats within the list) are skipped, never overwritten
    const { count } = await prisma.contact.createMany({ data: list, skipDuplicates: true });
    return c.json({ received: list.length, created: count, skipped: list.length - count }, 201);
  })

  .get("/", zValidator("query", listQuerySchema), async (c) => {
    const { status, city, search, page, pageSize } = c.req.valid("query");
    const where = {
      ...(status && { status }),
      ...(city && { city: { equals: city, mode: "insensitive" as const } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: normalizePhone(search) || search } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      prisma.contact.count({ where }),
      prisma.contact.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return c.json({ total, page, pageSize, items });
  })

  .get("/stats", async (c) => c.json(await getContactStats()))

  .get("/:id", async (c) => {
    const contact = await prisma.contact.findUnique({
      where: { id: c.req.param("id") },
      include: { messages: { orderBy: { createdAt: "desc" } } },
    });
    if (!contact) throw new HTTPException(404, { message: "Contact not found" });
    return c.json(contact);
  })

  .patch("/:id", zValidator("json", updateContactSchema), async (c) => {
    const id = c.req.param("id");
    if (!(await prisma.contact.findUnique({ where: { id }, select: { id: true } }))) {
      throw new HTTPException(404, { message: "Contact not found" });
    }

    const data = c.req.valid("json");
    if (data.phone && (await prisma.contact.findFirst({ where: { phone: data.phone, NOT: { id } } }))) {
      throw new HTTPException(409, { message: "Another contact already has this phone number" });
    }

    return c.json(await prisma.contact.update({ where: { id }, data }));
  })

  .delete("/:id", async (c) => {
    // Its message log is kept (contact_id is set to null) so sends stay auditable
    const { count } = await prisma.contact.deleteMany({ where: { id: c.req.param("id") } });
    if (count === 0) throw new HTTPException(404, { message: "Contact not found" });
    return c.body(null, 204);
  });
