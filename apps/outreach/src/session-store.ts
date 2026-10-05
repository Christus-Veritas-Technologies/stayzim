/**
 * whatsapp-web.js RemoteAuth store backed by Postgres (the WhatsappSession
 * model in packages/db/prisma/schema/outreach.prisma).
 *
 * RemoteAuth zips each account's Chromium profile and hands it to this store,
 * so every linked number is one row keyed "RemoteAuth-<account id>". A restart
 * or redeploy restores all of them without rescanning QR codes.
 *
 * Adapted from WD_logistics' agent/src/lib/wa-session-store.ts.
 */

import fs from "node:fs";
import path from "node:path";

import prisma from "@stayzim/db";

/** The places RemoteAuth has put the archive, newest convention first. */
function archiveCandidates(dataPath: string, session: string): string[] {
  return [
    // Current whatsapp-web.js: RemoteAuth.compressSession() writes <dataPath>/<session>.zip
    path.join(dataPath, `${session}.zip`),
    // Older versions wrote it relative to the working directory
    path.resolve(`${session}.zip`),
  ];
}

export class PostgresSessionStore {
  private readonly dataPath: string;

  /** @param dataPath the same directory given to RemoteAuth's `dataPath`, where it writes the archives. */
  constructor(dataPath: string) {
    this.dataPath = path.resolve(dataPath);
  }

  async sessionExists({ session }: { session: string }): Promise<boolean> {
    const row = await prisma.whatsappSession.findUnique({ where: { session }, select: { session: true } });
    return row !== null;
  }

  /**
   * Stores the archive RemoteAuth has just written.
   *
   * **Never throws.** RemoteAuth calls this from an uncaught setInterval, so a
   * rejection would become an unhandled rejection and kill the process — taking
   * every connected number down over one failed backup. The live session is
   * still in Chromium and the next cycle retries.
   */
  async save({ session }: { session: string }): Promise<void> {
    try {
      const file = this.locateArchive(session);
      const data = new Uint8Array(await fs.promises.readFile(file));

      await prisma.whatsappSession.upsert({
        where: { session },
        create: { session, data, sizeBytes: data.length },
        update: { data, sizeBytes: data.length },
      });

      console.log(`[session-store] ${session} saved (${(data.length / 1024 / 1024).toFixed(1)} MB)`);
    } catch (error) {
      console.error(
        `[session-store] ${session} backup failed; the pairing is still live but a restart would lose it. ` +
          `Retrying next cycle.`,
        error,
      );
    }
  }

  /** Writes the stored archive to the path RemoteAuth asks for. */
  async extract({ session, path: target }: { session: string; path: string }): Promise<void> {
    const row = await prisma.whatsappSession.findUnique({ where: { session }, select: { data: true } });
    if (!row) {
      // RemoteAuth checks sessionExists() first, so the row vanished in between.
      // Better to say so than hand Chromium an empty, corrupt profile.
      throw new Error(`No stored WhatsApp session named "${session}"`);
    }

    await fs.promises.writeFile(target, row.data);
    console.log(`[session-store] ${session} restored (${(row.data.length / 1024 / 1024).toFixed(1)} MB)`);
  }

  async delete({ session }: { session: string }): Promise<void> {
    await prisma.whatsappSession.deleteMany({ where: { session } });
    console.log(`[session-store] ${session} removed`);
  }

  async lastSavedAt(session: string): Promise<Date | null> {
    const row = await prisma.whatsappSession.findUnique({ where: { session }, select: { updatedAt: true } });
    return row?.updatedAt ?? null;
  }

  private locateArchive(session: string): string {
    const candidates = archiveCandidates(this.dataPath, session);
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
      throw new Error(`RemoteAuth left no archive for "${session}". Looked in: ${candidates.join(", ")}`);
    }
    return found;
  }
}
