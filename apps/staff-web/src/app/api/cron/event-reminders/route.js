import { timingSafeEqual } from "node:crypto";

import { jsonError } from "@ephemeris/auth";
import { ensureEventNotificationSchema, transaction } from "@ephemeris/db";
import { sendDueEventReminders } from "@ephemeris/events";

export const dynamic = "force-dynamic";

function authorized(request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return Boolean(secret) && header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/**
 * Sends due event reminders (48h, 24h, 3h, 2h, 1h) to external staff.
 * Call every 10 minutes with `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends this header).
 */
async function run(request) {
  try {
    if (!process.env.CRON_SECRET) {
      return Response.json({ error: "Event reminders are off: set CRON_SECRET to enable them." }, { status: 503 });
    }
    if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await ensureEventNotificationSchema();
    const result = await transaction((client) => sendDueEventReminders(client, { now: new Date() }));
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error);
  }
}

export const GET = run;
export const POST = run;
