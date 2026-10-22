import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser } from "@ephemeris/auth";
import { ensureInventorySchema, query } from "@ephemeris/db";

export async function GET(request) {
  try {
    const user = await requireUser(["admin", "internal", "external"]);
    await ensureInventorySchema();
    const url = new URL(request.url);
    const requestedResortId = url.searchParams.get("resortId");

    let whereClause = "";
    const params = [];

    if (user.role === "internal" || user.role === "external") {
      if (!user.resort_id) {
        return Response.json({ error: "Staff resort profile is not configured" }, { status: 403 });
      }
      whereClause = "WHERE i.resort_id = $1";
      params.push(user.resort_id);
    } else if (requestedResortId) {
      whereClause = "WHERE i.resort_id = $1";
      params.push(requestedResortId);
    }

    const { rows } = await query(
      `SELECT
        i.id, i.resort_id, r.name AS resort_name,
        i.item_name, i.category, i.quantity, i.unit,
        i.status, i.condition, i.location_details, i.notes,
        i.last_inspected_at, i.updated_by_id, u.name AS updated_by_name,
        i.created_at, i.updated_at
      FROM resort_inventory i
      LEFT JOIN resorts r ON r.id = i.resort_id
      LEFT JOIN users u ON u.id = i.updated_by_id
      ${whereClause}
      ORDER BY i.category ASC, i.item_name ASC`,
      params,
    );

    return Response.json({ items: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    await ensureInventorySchema();
    const user = await requireUser(["admin", "internal"]);
    const body = await parseJsonBody(request);

    const resortId = user.role === "internal" ? user.resort_id : body.resortId;
    if (!resortId) {
      throw new ApiError(400, "Resort ID wajib ditentukan");
    }

    const itemName = String(body.itemName || "").trim();
    if (!itemName) {
      throw new ApiError(400, "Nama item wajib diisi");
    }

    const category = String(body.category || "Equipment").trim();
    const quantity = Math.max(0, parseInt(body.quantity, 10) || 1);
    const unit = String(body.unit || "pcs").trim();
    const status = String(body.status || "available").trim();
    const condition = String(body.condition || "good").trim();
    const locationDetails = String(body.locationDetails || "").trim() || null;
    const notes = String(body.notes || "").trim() || null;

    const { rows } = await query(
      `INSERT INTO resort_inventory
        (resort_id, item_name, category, quantity, unit, status, \`condition\`, location_details, notes, updated_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, resort_id, item_name, category, quantity, unit, status, \`condition\`, location_details, notes, created_at, updated_at`,
      [resortId, itemName, category, quantity, unit, status, condition, locationDetails, notes, user.id],
    );

    return Response.json({ item: rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
