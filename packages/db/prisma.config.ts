import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  // Optional so `prisma generate` (run on every install) works without a database;
  // commands that connect, like db push, still say when it's missing
  datasource: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
