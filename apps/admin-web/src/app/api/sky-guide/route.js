import { ApiError, jsonError, requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";
import { monthsAheadWindow, skyGuide } from "@ephemeris/sky";

// Resort default coordinates (central Maldives), used when a resort has none recorded.
const DEFAULT_LOCATION = { latitude: 5.2893, longitude: 73.5358 };

/** Computed Sky Guide (moon, meteor showers, astronomy) for any resort (defaults to the first active one). */
export async function GET(request) {
  try {
    await requirePermission("admin.calendar", ["admin"]);
    const url = new URL(request.url);
    const resortId = url.searchParams.get("resortId");
    const { rows } = await query(
      `SELECT id, name, timezone, latitude, longitude FROM resorts
       WHERE ($1::text IS NULL OR id = $1)
       ORDER BY status = 'active' DESC, name
       LIMIT 1`,
      [resortId || null],
    );
    const resort = rows[0];
    if (!resort) throw new ApiError(404, "Resort not found");

    const hasLocation = resort.latitude != null && resort.longitude != null;
    const timeZone = resort.timezone || "UTC";
    const window = monthsAheadWindow(timeZone, url.searchParams.get("months"));
    const guide = skyGuide({
      latitude: hasLocation ? Number(resort.latitude) : DEFAULT_LOCATION.latitude,
      longitude: hasLocation ? Number(resort.longitude) : DEFAULT_LOCATION.longitude,
      from: window.from,
      to: window.to,
    });

    return Response.json({
      resort: { id: resort.id, name: resort.name, timezone: timeZone, locationEstimated: !hasLocation },
      window,
      ...guide,
    });
  } catch (error) {
    return jsonError(error);
  }
}
