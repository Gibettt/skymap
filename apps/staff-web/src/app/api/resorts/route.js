import { jsonError, requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";

export async function GET() {
  try {
    const user = await requirePermission("staff.bookings", ["internal", "external"]);
    if (!user.resort_id) {
      return Response.json({ error: "Staff resort profile is not configured" }, { status: 403 });
    }

    const { rows } = await query(
      `SELECT id, name, code, location, timezone, observation_spots,
              contact_name, contact_phone, latitude, longitude, status
       FROM resorts
       WHERE id = $1 AND status = 'active'
       LIMIT 1`,
      [user.resort_id],
    );
    const myResort = rows[0] || null;

    return Response.json({
      resorts: rows,
      myResort,
    });
  } catch (error) {
    return jsonError(error);
  }
}
