import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@stayzim/env/server";

import { PrismaClient } from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;

/** Enums (e.g. Device, SiteEventType), so apps can name the types Prisma returns. */
export * from "../prisma/generated/enums";
